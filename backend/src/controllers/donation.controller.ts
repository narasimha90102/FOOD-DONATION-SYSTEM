import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Donation } from '../models/Donation';
import { User } from '../models/User';
import { Chat } from '../models/Chat';
import { AIService } from '../services/ai.service';
import { LocationService } from '../services/location.service';
import { SocketService } from '../services/socket.service';

/**
 * @desc    Create a new food donation listing
 * @route   POST /api/donations
 * @access  Private (DONOR only)
 */
export const createDonation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'DONOR') {
      return res.status(403).json({ success: false, message: 'Only donors can upload food listings.' });
    }

    const {
      foodName,
      foodCategory,
      quantity,
      unit,
      preparationTime,
      estimatedExpiryTime,
      storageCondition,
      pickupAddress,
      coordinates,
      foodImages,
      specialInstructions,
    } = req.body;

    if (!foodName || !foodCategory || !quantity || !unit || !preparationTime || !estimatedExpiryTime || !coordinates) {
      return res.status(400).json({ success: false, message: 'Please fill in all mandatory donation fields.' });
    }

    // Convert and parse coordinates
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid coordinate format. Expected [longitude, latitude]' });
    }
    const long = Number(coordinates[0]);
    const lat = Number(coordinates[1]);

    // 1. Core AI Expiry Prediction
    const aiPrediction = AIService.predictExpiry({
      foodCategory,
      preparationTime: new Date(preparationTime),
      estimatedExpiryTime: new Date(estimatedExpiryTime),
      storageCondition: storageCondition || 'ambient',
    });

    // 2. Core Trust Score Calculation
    const donorTrustScore = req.user.trustScore;

    const donation = await Donation.create({
      donor: req.user._id,
      foodName,
      foodCategory,
      quantity: Number(quantity),
      unit,
      preparationTime: new Date(preparationTime),
      estimatedExpiryTime: new Date(estimatedExpiryTime),
      storageCondition: storageCondition || 'ambient',
      pickupAddress,
      location: {
        type: 'Point',
        coordinates: [long, lat] as [number, number],
      },
      foodImages: foodImages || [],
      specialInstructions: specialInstructions || '',
      status: 'PENDING',
      statusHistory: [{ status: 'PENDING', updatedBy: req.user._id, updatedAt: new Date() }],
      aiSafeWindowHours: aiPrediction.aiSafeWindowHours,
      aiFreshnessScore: aiPrediction.aiFreshnessScore,
      aiRiskLevel: aiPrediction.aiRiskLevel,
      aiRecommendation: aiPrediction.aiRecommendation,
    });

    // 3. Find and Alert nearby NGOs dynamically
    const ngos = await User.find({ role: 'NGO', ngoVerificationStatus: 'APPROVED' });
    const matchedNGOs = LocationService.filterAndMatchNGOs(
      [long, lat],
      foodCategory,
      ngos,
      15 // 15 KM Radius
    );

    // Push notifications via socket to nearest matched NGOs
    for (const match of matchedNGOs) {
      const ngoId = match.ngo._id.toString();
      await SocketService.sendSystemNotification(ngoId, {
        title: 'New Food Donation Nearby!',
        message: `"${foodName}" is available for pickup ${match.distance} km away from your center.`,
        type: 'NEW_DONATION',
        relatedId: donation._id.toString(),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Donation uploaded successfully. Alerted nearest matching NGOs.',
      donation,
      nearestNGOsCount: matchedNGOs.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get donations (with status and role-based filtering)
 * @route   GET /api/donations
 * @access  Private
 */
export const getDonations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const query: any = {};

    // Donors see their own uploads
    if (req.user?.role === 'DONOR') {
      query.donor = req.user._id;
    }
    // NGOs see donations they have accepted
    else if (req.user?.role === 'NGO') {
      query.ngo = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const donations = await Donation.find(query)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: donations.length,
      donations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    NGO browsing nearby unclaimed food listings (within 15km)
 * @route   GET /api/donations/nearby
 * @access  Private (NGO only)
 */
export const getNearbyDonations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'NGO') {
      return res.status(403).json({ success: false, message: 'Only registered organizations can browse local listings.' });
    }

    const { longitude, latitude, radius = 15 } = req.query;

    let ngoLng = req.user.location?.coordinates[0] || 0;
    let ngoLat = req.user.location?.coordinates[1] || 0;
    let locationKnown = true;

    // Use query inputs if provided explicitly (e.g. browser GPS)
    if (longitude && latitude) {
      ngoLng = Number(longitude);
      ngoLat = Number(latitude);
    }

    // If still no location — fall back to showing ALL pending listings
    if (ngoLng === 0 && ngoLat === 0) {
      locationKnown = false;
    }

    // Retrieve active unclaimed donations
    const unclaimedDonations = await Donation.find({ status: 'PENDING' })
      .populate('donor', 'name email trustScore ratingAverage profilePicture');

    const matchedList: any[] = [];
    const maxRadius = Number(radius);

    for (const don of unclaimedDonations) {
      const [donLng, donLat] = don.location.coordinates;

      // Calculate distance only when NGO location is known
      const distance = locationKnown
        ? LocationService.calculateDistance(ngoLat, ngoLng, donLat, donLng)
        : -1; // -1 signals "distance unknown" to the frontend

      // When location is known, filter by radius; otherwise include all listings
      if (!locationKnown || distance <= maxRadius) {
        const freshOutput = AIService.predictExpiry({
          foodCategory: don.foodCategory,
          preparationTime: don.preparationTime,
          estimatedExpiryTime: don.estimatedExpiryTime,
          storageCondition: don.storageCondition,
        });

        const donObj = don.toObject();
        donObj.aiFreshnessScore = freshOutput.aiFreshnessScore;
        donObj.aiSafeWindowHours = freshOutput.aiSafeWindowHours;
        donObj.aiRiskLevel = freshOutput.aiRiskLevel;
        donObj.aiRecommendation = freshOutput.aiRecommendation;

        matchedList.push({ ...donObj, distance });
      }
    }

    // Sort closest first (unknown distance listings go last)
    matchedList.sort((a, b) => {
      if (a.distance === -1) return 1;
      if (b.distance === -1) return -1;
      return a.distance - b.distance;
    });

    res.status(200).json({
      success: true,
      count: matchedList.length,
      locationKnown,
      donations: matchedList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get donation details by ID
 * @route   GET /api/donations/:id
 * @access  Private
 */
export const getDonationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture ngoAcceptedCategories location');

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation post not found.' });
    }

    res.status(200).json({
      success: true,
      donation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    NGO accepts a pending food donation
 * @route   PUT /api/donations/:id/accept
 * @access  Private (NGO only)
 */
export const acceptDonation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'NGO') {
      return res.status(403).json({ success: false, message: 'Only verified organizations can accept active listings.' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    if (donation.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Donation is already claimed or closed.' });
    }

    // Update status
    donation.ngo = req.user._id;
    donation.status = 'ACCEPTED';
    donation.statusHistory.push({ status: 'ACCEPTED', updatedBy: req.user._id, updatedAt: new Date() });
    await donation.save();

    // Establish a real-time Chat room automatically for this pipeline
    let chat = await Chat.findOne({ donation: donation._id });
    if (!chat) {
      chat = await Chat.create({
        donation: donation._id,
        donor: donation.donor,
        ngo: req.user._id,
        messages: [{
          sender: req.user._id,
          text: `Hello! We are from ${req.user.name}. We have accepted your food donation listing and are ready to coordinate pickup!`,
        }],
      });
    }

    // Notify Donor
    const donorIdStr = donation.donor.toString();
    await SocketService.sendSystemNotification(donorIdStr, {
      title: 'Donation Accepted!',
      message: `${req.user.name} has claimed your donation of "${donation.foodName}".`,
      type: 'DONATION_ACCEPTED',
      relatedId: donation._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Donation accepted. Communication chat initialized.',
      donation,
      chatId: chat._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update delivery progress states (ACCEPTED -> PICKED_UP -> DELIVERED -> COMPLETED)
 * @route   PUT /api/donations/:id/status
 * @access  Private
 */
export const updateDonationStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found.' });
    }

    // Authorization check
    const isDonor = donation.donor.toString() === req.user?._id.toString();
    const isNGO = donation.ngo && donation.ngo.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isDonor && !isNGO && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this donation status.' });
    }

    // Status transitions and notifications
    donation.status = status;
    donation.statusHistory.push({ status, updatedBy: (req.user?._id || donation.donor) as any, updatedAt: new Date() });
    await donation.save();

    const donorIdStr = donation.donor.toString();
    const ngoIdStr = donation.ngo ? donation.ngo.toString() : '';

    if (status === 'PICKED_UP') {
      // NGO picked up, notify donor
      await SocketService.sendSystemNotification(donorIdStr, {
        title: 'Food Picked Up! 🚚',
        message: `Your donation "${donation.foodName}" has been collected and is now on its way to the distribution centre.`,
        type: 'PICKUP_STARTED',
        relatedId: donation._id.toString(),
      });
    } else if (status === 'DELIVERED') {
      // Delivered to the NGO centre — notify donor
      await SocketService.sendSystemNotification(donorIdStr, {
        title: 'Donation Delivered! 📦',
        message: `"${donation.foodName}" has been delivered to the NGO centre and is being prepared for distribution.`,
        type: 'DELIVERY_COMPLETED',
        relatedId: donation._id.toString(),
      });
      // Notify NGO as well
      if (ngoIdStr) {
        await SocketService.sendSystemNotification(ngoIdStr, {
          title: 'Food Arrived at Centre',
          message: `"${donation.foodName}" has arrived. Please prepare it for beneficiary distribution.`,
          type: 'DELIVERY_COMPLETED',
          relatedId: donation._id.toString(),
        });
      }
    } else if (status === 'COMPLETED') {
      // Completed, give Donor points and log metrics
      const donor = await User.findById(donation.donor);
      if (donor) {
        // Calculate Dynamic Point updates
        const mealsAdded = donation.quantity * (donation.unit.toLowerCase().includes('serv') ? 1 : 4); //servings or kg
        const co2Added = parseFloat((donation.quantity * 2.5).toFixed(1)); // 2.5kg CO2 saved per kg of food saved
        
        donor.mealsSaved += mealsAdded;
        donor.co2Reduction += co2Added;
        donor.impactPoints += Math.round(mealsAdded * 10); // 10 points per meal

        // Handle Streaks
        const today = new Date();
        if (donor.lastDonationDate) {
          const diffDays = Math.floor((today.getTime() - donor.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 1) {
            donor.activeStreak += 1;
          } else if (diffDays > 2) {
            donor.activeStreak = 1;
          }
        } else {
          donor.activeStreak = 1;
        }
        donor.lastDonationDate = today;
        
        // Increase trust score for completed cycles
        donor.trustScore = Math.min(100, donor.trustScore + 2);
        await donor.save();

        // Notify donor about trust score increase
        await SocketService.sendSystemNotification(donorIdStr, {
          title: '⭐ Trust Score Increased!',
          message: `Great work! Your Trust Score has increased to ${donor.trustScore}% for completing a full donation cycle.`,
          type: 'TRUST_SCORE_UPDATE',
          relatedId: donation._id.toString(),
        });
      }

      // Notify NGO & Donor
      await SocketService.sendSystemNotification(donorIdStr, {
        title: 'Donation Completed! 🎉',
        message: `Thank you! Your donation of "${donation.foodName}" was successfully distributed. Impact points added!`,
        type: 'DELIVERY_COMPLETED',
        relatedId: donation._id.toString(),
      });

      if (ngoIdStr) {
        await SocketService.sendSystemNotification(ngoIdStr, {
          title: 'Donation Logged!',
          message: `The delivery of "${donation.foodName}" has been successfully completed.`,
          type: 'DELIVERY_COMPLETED',
          relatedId: donation._id.toString(),
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Donation status updated to ${status}`,
      donation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    donor impact stats metrics
 * @route   GET /api/donations/donor-stats
 * @access  Private (DONOR only)
 */
export const getDonorStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    
    const activeDonationsCount    = await Donation.countDocuments({ donor: userId, status: { $in: ['PENDING', 'ACCEPTED', 'PICKED_UP'] } });
    const completedDonationsCount = await Donation.countDocuments({ donor: userId, status: 'COMPLETED' });
    const totalDonationsPosted    = await Donation.countDocuments({ donor: userId });

    // Sum up total quantity ever donated (kg/servings) for all-time impact display
    const quantityAgg = await Donation.aggregate([
      { $match: { donor: userId } },
      { $group: { _id: null, totalQty: { $sum: '$quantity' } } },
    ]);
    const totalQuantity = quantityAgg[0]?.totalQty || 0;

    res.status(200).json({
      success: true,
      stats: {
        impactPoints:          req.user?.impactPoints  || 0,
        mealsSaved:            req.user?.mealsSaved    || 0,
        co2Reduction:          req.user?.co2Reduction  || 0,
        activeStreak:          req.user?.activeStreak  || 0,
        trustScore:            req.user?.trustScore    || 85,
        activeDonationsCount,
        completedDonationsCount,
        totalDonationsPosted,
        totalQuantity,
      },
    });
  } catch (error) {
    next(error);
  }
};
