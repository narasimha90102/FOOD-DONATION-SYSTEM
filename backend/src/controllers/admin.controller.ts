import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { User } from '../models/User';
import { Donation } from '../models/Donation';
import { SocketService } from '../services/socket.service';

/**
 * @desc    Fetch Admin Panel analytics metrics
 * @route   GET /api/admin/analytics
 * @access  Private (ADMIN only)
 */
export const getAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. User counts
    const totalDonors = await User.countDocuments({ role: 'DONOR' });
    const totalNGOs = await User.countDocuments({ role: 'NGO' });
    const totalVolunteers = await User.countDocuments({ role: 'VOLUNTEER' });
    const pendingNGOs = await User.countDocuments({ role: 'NGO', ngoVerificationStatus: 'PENDING' });

    // 2. Donation metrics
    const totalDonations = await Donation.countDocuments();
    const activeDonations = await Donation.countDocuments({ status: 'PENDING' });
    const completedDonations = await Donation.countDocuments({ status: 'COMPLETED' });

    // 3. Mathematical sums (Meals & CO2)
    const mealAgg = await User.aggregate([{ $group: { _id: null, totalMeals: { $sum: '$mealsSaved' }, totalCO2: { $sum: '$co2Reduction' } } }]);
    const totalMealsSaved = mealAgg[0]?.totalMeals || 0;
    const totalCO2Reduction = parseFloat((mealAgg[0]?.totalCO2 || 0).toFixed(1));

    // 4. Food category distributions
    const categoryDistribution = await Donation.aggregate([
      { $group: { _id: '$foodCategory', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
    ]);

    // 5. Recent donations feed
    const recentDonations = await Donation.find()
      .populate('donor', 'name email')
      .populate('ngo', 'name')
      .populate('volunteer', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      analytics: {
        users: {
          donors: totalDonors,
          ngos: totalNGOs,
          volunteers: totalVolunteers,
          pendingNgos: pendingNGOs,
        },
        donations: {
          total: totalDonations,
          active: activeDonations,
          completed: completedDonations,
        },
        impact: {
          mealsSaved: totalMealsSaved,
          co2Reduction: totalCO2Reduction,
        },
        categories: categoryDistribution,
        recentDonations,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch system users
 * @route   GET /api/admin/users
 * @access  Private (ADMIN only)
 */
export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role } = req.query;
    const filter: any = {};
    
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle blocking / suspending user accounts
 * @route   PUT /api/admin/users/:id/block
 * @access  Private (ADMIN only)
 */
export const toggleBlockUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Cannot block administrative accounts.' });
    }

    // Toggle status
    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User profile is now ${user.isBlocked ? 'SUSPENDED' : 'ACTIVATED'}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or reject pending NGO verification documents
 * @route   PUT /api/admin/ngos/:id/verify
 * @access  Private (ADMIN only)
 */
export const verifyNGO = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update. Select APPROVED or REJECTED.' });
    }

    const ngo = await User.findById(req.params.id);

    if (!ngo || ngo.role !== 'NGO') {
      return res.status(404).json({ success: false, message: 'NGO organization record not found.' });
    }

    ngo.ngoVerificationStatus = status;
    
    // Give dynamic Trust score adjustments for approvals
    if (status === 'APPROVED') {
      ngo.trustScore = 95;
    } else {
      ngo.trustScore = 40;
    }
    
    await ngo.save();

    // Trigger push notification to user
    const textStatus = status.toLowerCase();
    await SocketService.sendSystemNotification(ngo._id.toString(), {
      title: `Verification Request: ${status}!`,
      message: `Your organization document review is completed and has been ${textStatus}.`,
      type: 'VERIFICATION_UPDATE',
    });

    res.status(200).json({
      success: true,
      message: `Organization verification status set to ${status}.`,
      ngo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve or reject a pending NGO or Volunteer account
 * @route   PUT /api/admin/users/:id/approve
 * @access  Private (ADMIN only)
 */
export const approveUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Select approve or reject.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (targetUser.role !== 'NGO' && targetUser.role !== 'VOLUNTEER') {
      return res.status(400).json({ success: false, message: 'Only NGO and Volunteer accounts require administrator approval.' });
    }

    if (action === 'approve') {
      targetUser.approvalStatus = 'approved';
      targetUser.status = 'active';
      if (targetUser.role === 'NGO') {
        targetUser.ngoVerificationStatus = 'APPROVED';
        targetUser.trustScore = 95;
      } else {
        targetUser.trustScore = 90;
      }
    } else {
      targetUser.approvalStatus = 'rejected';
      targetUser.status = 'rejected';
      if (targetUser.role === 'NGO') {
        targetUser.ngoVerificationStatus = 'REJECTED';
        targetUser.trustScore = 40;
      } else {
        targetUser.trustScore = 40;
      }
    }

    await targetUser.save();

    // Trigger push notification to user on approval
    if (action === 'approve') {
      const title = targetUser.role === 'VOLUNTEER' ? 'Account Approved ✅' : 'NGO Account Approved ✅';
      const message = targetUser.role === 'VOLUNTEER'
        ? 'Your volunteer account has been approved by the administrator. You can now log in and use FoodBridge AI.'
        : 'Your NGO account has been approved by the administrator. You can now log in and use FoodBridge AI.';

      await SocketService.sendSystemNotification(targetUser._id.toString(), {
        title,
        message,
        type: 'VERIFICATION_UPDATE',
      });
    }

    res.status(200).json({
      success: true,
      message: `User account has been successfully ${action}d.`,
      user: targetUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin delete any user account
 * @route   DELETE /api/admin/users/:id
 * @access  Private (ADMIN only)
 */
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    if (targetUser.role === 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one administrator account must remain.',
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `User account "${targetUser.name}" (${targetUser.email}) deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Promote user role to ADMIN
 * @route   PUT /api/admin/users/:id/make-admin
 * @access  Private (ADMIN only)
 */
export const makeUserAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    targetUser.role = 'ADMIN';
    targetUser.status = 'active';
    targetUser.approvalStatus = 'approved';
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User "${targetUser.name}" is now an Administrator.`,
      user: targetUser,
    });
  } catch (error) {
    next(error);
  }
};

