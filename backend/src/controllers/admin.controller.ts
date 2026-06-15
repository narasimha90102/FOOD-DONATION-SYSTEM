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
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      analytics: {
        users: {
          donors: totalDonors,
          ngos: totalNGOs,
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
