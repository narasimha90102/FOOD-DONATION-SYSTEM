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

    const expiryDate = new Date(estimatedExpiryTime);
    if (expiryDate.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'Estimated expiry time must be in the future.' });
    }

    // Convert and parse coordinates
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ success: false, message: 'Invalid coordinate format. Expected [longitude, latitude]' });
    }
    const long = Number(coordinates[0]);
    const lat = Number(coordinates[1]);

    if (isNaN(long) || isNaN(lat) || (long === 0 && lat === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Valid location coordinates are required. (0, 0) coordinates are invalid.',
      });
    }

    // 1. Core AI Expiry Prediction
    let aiPrediction;
    try {
      aiPrediction = await AIService.predictExpiry({
        foodCategory,
        preparationTime: new Date(preparationTime),
        estimatedExpiryTime: new Date(estimatedExpiryTime),
        storageCondition: storageCondition || 'ambient',
      });
    } catch (aiErr: any) {
      if (aiErr.message && aiErr.message.includes('unavailable')) {
        return res.status(503).json({ success: false, message: aiErr.message });
      }
      throw aiErr;
    }

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

    // Broadcast donation creation event to all users for real-time synchronization
    SocketService.broadcast('donation_created', donation);
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
    // Auto-expire items whose expiry time has passed
    const nowTime = new Date();
    await Donation.updateMany(
      { status: { $nin: ['EXPIRED', 'COMPLETED', 'CANCELLED', 'DELIVERED', 'DISTRIBUTED'] }, estimatedExpiryTime: { $lte: nowTime } },
      { $set: { status: 'EXPIRED' } }
    );

    const { status } = req.query;
    const query: any = {};

    // Donors see ONLY their own listings
    if (req.user?.role === 'DONOR') {
      query.donor = req.user._id;
    }
    // NGOs see ONLY listings assigned to/accepted by them
    else if (req.user?.role === 'NGO') {
      query.ngo = req.user._id;
    }
    // Volunteers see unclaimed NGO_ACCEPTED tasks OR tasks assigned to them
    else if (req.user?.role === 'VOLUNTEER') {
      query.$or = [
        { status: 'NGO_ACCEPTED', volunteer: { $exists: false } },
        { volunteer: req.user._id }
      ];
    }

    if (status) {
      query.status = status;
    }

    // Retrieve user coordinates to compute real distance on the list
    const userLng = req.user?.location?.coordinates?.[0] || 0;
    const userLat = req.user?.location?.coordinates?.[1] || 0;
    const locationKnown = userLng !== 0 || userLat !== 0;

    const donations = await Donation.find(query)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture location')
      .populate('volunteer', 'name email phoneNumber profilePicture')
      .sort({ createdAt: -1 });

    const donationsWithDistance = donations.map((don) => {
      const [donLng, donLat] = don.location.coordinates;
      const distance = locationKnown
        ? LocationService.calculateDistance(userLat, userLng, donLat, donLng)
        : -1;
      return { ...don.toObject(), distance };
    });

    res.status(200).json({
      success: true,
      count: donationsWithDistance.length,
      donations: donationsWithDistance,
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
    // Auto-expire items whose expiry time has passed
    const nowTime = new Date();
    await Donation.updateMany(
      { status: { $nin: ['EXPIRED', 'COMPLETED', 'CANCELLED', 'DELIVERED', 'DISTRIBUTED'] }, estimatedExpiryTime: { $lte: nowTime } },
      { $set: { status: 'EXPIRED' } }
    );

    if (req.user?.role !== 'NGO') {
      return res.status(403).json({ success: false, message: 'Only registered organizations can browse local listings.' });
    }

    const { longitude, latitude } = req.query;

    let ngoLng = req.user.location?.coordinates[0] || 0;
    let ngoLat = req.user.location?.coordinates[1] || 0;
    let locationKnown = true;

    // Use query inputs if provided explicitly (e.g. browser GPS)
    if (longitude && latitude) {
      ngoLng = Number(longitude);
      ngoLat = Number(latitude);
    }

    // Mark location as unknown when coordinates are the default [0, 0]
    if (ngoLng === 0 && ngoLat === 0) {
      locationKnown = false;
    }

    // Always retrieve ALL active unclaimed donations — every NGO sees every listing
    const unclaimedDonations = await Donation.find({ status: 'PENDING' })
      .sort({ createdAt: -1 }) // Newest first as secondary sort
      .populate('donor', 'name email trustScore ratingAverage profilePicture');

    const allListings: any[] = await Promise.all(
      unclaimedDonations.map(async (don) => {
        const [donLng, donLat] = don.location.coordinates;

        // Compute distance for display purposes only — never used to filter
        const distance = locationKnown
          ? LocationService.calculateDistance(ngoLat, ngoLng, donLat, donLng)
          : -1; // -1 = distance unknown, displayed as "Unknown" on the frontend

        let freshOutput;
        try {
          freshOutput = await AIService.predictExpiry({
            foodCategory: don.foodCategory,
            preparationTime: don.preparationTime,
            estimatedExpiryTime: don.estimatedExpiryTime,
            storageCondition: don.storageCondition,
          });
        } catch (err) {
          // Fallback to database values on transient Ollama offline state for lists
          freshOutput = {
            aiFreshnessScore: don.aiFreshnessScore || 85,
            aiSafeWindowHours: don.aiSafeWindowHours || 8,
            aiRiskLevel: don.aiRiskLevel || 'safe',
            aiRecommendation: don.aiRecommendation || 'Safe to consume. Check smell.',
          };
        }

        const donObj = don.toObject();
        donObj.aiFreshnessScore = freshOutput.aiFreshnessScore;
        donObj.aiSafeWindowHours = freshOutput.aiSafeWindowHours;
        donObj.aiRiskLevel = freshOutput.aiRiskLevel;
        donObj.aiRecommendation = freshOutput.aiRecommendation;

        return { ...donObj, distance };
      })
    );

    const radius = Number(req.query.radius) || 15;

    // Filter by radius if location is known
    const filteredListings = allListings.filter((item) => {
      if (!locationKnown) return true;
      return item.distance !== -1 && item.distance <= radius;
    });

    // Sort: closest first when location known, newest first otherwise
    filteredListings.sort((a, b) => {
      if (a.distance === -1 && b.distance === -1) return 0;
      if (a.distance === -1) return 1;
      if (b.distance === -1) return -1;
      return a.distance - b.distance;
    });

    res.status(200).json({
      success: true,
      count: filteredListings.length,
      locationKnown,
      donations: filteredListings,
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
    // Auto-expire items whose expiry time has passed
    const nowTime = new Date();
    await Donation.updateMany(
      { status: { $nin: ['EXPIRED', 'COMPLETED', 'CANCELLED', 'DELIVERED', 'DISTRIBUTED'] }, estimatedExpiryTime: { $lte: nowTime } },
      { $set: { status: 'EXPIRED' } }
    );

    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture ngoAcceptedCategories location')
      .populate('volunteer', 'name email phoneNumber profilePicture')
      .populate('cancelledBy', 'name email profilePicture');

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

    const { destinationAddress, destinationCoordinates } = req.body;

    // Update status and NGO destination details
    donation.ngo = req.user._id;
    donation.status = 'NGO_ACCEPTED';
    donation.statusHistory.push({ status: 'NGO_ACCEPTED', updatedBy: req.user._id, updatedAt: new Date() });

    // Store NGO destination location details if provided or fallback to NGO profile
    const finalDestAddress = destinationAddress || req.user.address || 'Verified NGO Hub';
    const finalDestCoords = (Array.isArray(destinationCoordinates) && destinationCoordinates.length === 2)
      ? [Number(destinationCoordinates[0]), Number(destinationCoordinates[1])]
      : (req.user.location?.coordinates || [80.016108, 13.028344]);

    (donation as any).destinationAddress = finalDestAddress;
    (donation as any).destinationLocation = {
      type: 'Point',
      coordinates: finalDestCoords,
    };

    await donation.save();

    // Re-fetch fully populated donation so response & socket payload have all nested objects
    const populatedDonation = await Donation.findById(donation._id)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture ngoAcceptedCategories location')
      .populate('volunteer', 'name email phoneNumber profilePicture')
      .populate('cancelledBy', 'name email profilePicture');

    // Broadcast update event to all users for real-time synchronization
    SocketService.broadcast('donation_updated', populatedDonation);

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
      donation: populatedDonation,
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
    const isVolunteer = donation.volunteer && donation.volunteer.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isDonor && !isNGO && !isVolunteer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this donation status.' });
    }

    if (status === 'CANCELLED') {
      donation.cancelledBy = req.user?._id as any;
      donation.cancelledByRole = req.user?.role as any;
      donation.cancelledAt = new Date();
      donation.cancellationReason = req.body.reason || 'Cancelled by donor/admin';
    }

    // Status transitions and notifications
    donation.status = status;
    donation.statusHistory.push({ status, updatedBy: (req.user?._id || donation.donor) as any, updatedAt: new Date() });
    await donation.save();

    // Re-fetch fully populated donation so response & socket payload have all nested objects
    const populatedDonation = await Donation.findById(donation._id)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture ngoAcceptedCategories location')
      .populate('volunteer', 'name email phoneNumber profilePicture')
      .populate('cancelledBy', 'name email profilePicture');

    // Broadcast update event to all users for real-time synchronization
    SocketService.broadcast('donation_updated', populatedDonation);

    const donorIdStr = donation.donor.toString();
    const ngoIdStr = donation.ngo ? donation.ngo.toString() : '';
    const userRealName = req.user?.name || 'A volunteer';

    if (status === 'GOING_TO_PICKUP') {
      await SocketService.sendSystemNotification(donorIdStr, {
        title: 'Volunteer en route! 🏍️',
        message: `Volunteer "${userRealName}" is on the way to pick up your donation.`,
        type: 'PICKUP_STARTED',
        relatedId: donation._id.toString(),
      });
      if (ngoIdStr) {
        await SocketService.sendSystemNotification(ngoIdStr, {
          title: 'Volunteer Heading to Pickup',
          message: `Volunteer "${userRealName}" is going to collect "${donation.foodName}".`,
          type: 'PICKUP_STARTED',
          relatedId: donation._id.toString(),
        });
      }
    } else if (status === 'PICKED_UP') {
      await SocketService.sendSystemNotification(donorIdStr, {
        title: 'Food Picked Up! 🚚',
        message: `Your donation "${donation.foodName}" has been collected by volunteer "${userRealName}".`,
        type: 'PICKUP_STARTED',
        relatedId: donation._id.toString(),
      });
      if (ngoIdStr) {
        await SocketService.sendSystemNotification(ngoIdStr, {
          title: 'Surplus Collected',
          message: `Volunteer "${userRealName}" has collected "${donation.foodName}".`,
          type: 'PICKUP_STARTED',
          relatedId: donation._id.toString(),
        });
      }
    } else if (status === 'IN_TRANSIT') {
      if (ngoIdStr) {
        await SocketService.sendSystemNotification(ngoIdStr, {
          title: 'Food In Transit 🚚',
          message: `Volunteer "${userRealName}" is in transit with your claimed food.`,
          type: 'PICKUP_STARTED',
          relatedId: donation._id.toString(),
        });
      }
    } else if (status === 'DELIVERED') {
      await SocketService.sendSystemNotification(donorIdStr, {
        title: 'Donation Delivered! 📦',
        message: `"${donation.foodName}" has been delivered to the NGO hub by volunteer "${userRealName}".`,
        type: 'DELIVERY_COMPLETED',
        relatedId: donation._id.toString(),
      });
      if (ngoIdStr) {
        await SocketService.sendSystemNotification(ngoIdStr, {
          title: 'Food Arrived at Centre',
          message: `"${donation.foodName}" has been delivered by "${userRealName}". Please log the distribution.`,
          type: 'DELIVERY_COMPLETED',
          relatedId: donation._id.toString(),
        });
      }
    } else if (status === 'CANCELLED') {
      const recipientIds = new Set<string>();
      const userRealName = req.user?.name || 'User';

      let title = 'Food Donation Cancelled ❌';
      let message = `The donation listing for "${donation.foodName}" has been cancelled.`;

      const admins = await User.find({ role: 'ADMIN' });

      if (req.user?.role === 'DONOR') {
        title = 'Food Donation Cancelled ❌';
        message = `Donor "${userRealName}" cancelled the donation "${donation.foodName}".`;

        // Notify Admins
        for (const admin of admins) {
          recipientIds.add(admin._id.toString());
        }
        // Notify Assigned NGO
        if (donation.ngo) {
          recipientIds.add(donation.ngo.toString());
        } else {
          // Notify nearby NGOs (within 15km)
          const [donLng, donLat] = donation.location.coordinates;
          const ngos = await User.find({ role: 'NGO', isBlocked: false, approvalStatus: 'approved' });
          for (const ngo of ngos) {
            if (ngo.location?.coordinates) {
              const [ngoLng, ngoLat] = ngo.location.coordinates;
              const distance = LocationService.calculateDistance(donLat, donLng, ngoLat, ngoLng);
              if (distance <= 15) {
                recipientIds.add(ngo._id.toString());
              }
            }
          }
        }
        // Notify Assigned Volunteer
        if (donation.volunteer) {
          recipientIds.add(donation.volunteer.toString());
        }
      } else if (req.user?.role === 'NGO') {
        title = 'Food Request Cancelled ❌';
        message = `NGO "${userRealName}" cancelled the request for "${donation.foodName}".`;

        // Notify Admins
        for (const admin of admins) {
          recipientIds.add(admin._id.toString());
        }
        // Notify Donor
        if (donation.donor) {
          recipientIds.add(donation.donor.toString());
        }
        // Notify Assigned Volunteer
        if (donation.volunteer) {
          recipientIds.add(donation.volunteer.toString());
        }
      } else if (req.user?.role === 'ADMIN') {
        title = 'Food Donation Cancelled ❌';
        message = `Admin cancelled the donation "${donation.foodName}".`;

        // Notify Donor
        if (donation.donor) {
          recipientIds.add(donation.donor.toString());
        }
        // Notify Assigned NGO
        if (donation.ngo) {
          recipientIds.add(donation.ngo.toString());
        } else {
          // Notify nearby NGOs (within 15km)
          const [donLng, donLat] = donation.location.coordinates;
          const ngos = await User.find({ role: 'NGO', isBlocked: false, approvalStatus: 'approved' });
          for (const ngo of ngos) {
            if (ngo.location?.coordinates) {
              const [ngoLng, ngoLat] = ngo.location.coordinates;
              const distance = LocationService.calculateDistance(donLat, donLng, ngoLat, ngoLng);
              if (distance <= 15) {
                recipientIds.add(ngo._id.toString());
              }
            }
          }
        }
        // Notify Assigned Volunteer
        if (donation.volunteer) {
          recipientIds.add(donation.volunteer.toString());
        }
      } else {
        if (donation.donor) recipientIds.add(donation.donor.toString());
        if (donation.ngo) recipientIds.add(donation.ngo.toString());
        if (donation.volunteer) recipientIds.add(donation.volunteer.toString());
      }

      // Send targeted notifications to Set items
      for (const recipientId of recipientIds) {
        await SocketService.sendSystemNotification(recipientId, {
          title,
          message,
          type: 'DONATION_CANCELLED',
          relatedId: donation._id.toString(),
        });
      }
    } else if (status === 'COMPLETED') {
      // Completed, give Donor points and log metrics
      const donor = await User.findById(donation.donor);
      if (donor) {
        const mealsAdded = donation.quantity * (donation.unit.toLowerCase().includes('serv') ? 1 : 4);
        const co2Added = parseFloat((donation.quantity * 2.5).toFixed(1));
        
        donor.mealsSaved += mealsAdded;
        donor.co2Reduction += co2Added;
        donor.impactPoints += Math.round(mealsAdded * 10);

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
        
        donor.trustScore = Math.min(100, donor.trustScore + 2);
        await donor.save();

        await SocketService.sendSystemNotification(donorIdStr, {
          title: '⭐ Trust Score Increased!',
          message: `Great work! Your Trust Score has increased to ${donor.trustScore}% for completing a full donation cycle.`,
          type: 'TRUST_SCORE_UPDATE',
          relatedId: donation._id.toString(),
        });
      }

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
      donation: populatedDonation,
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
    const donorId = req.user?._id;
    
    // Count this donor's active and completed postings
    const activeDonationsCount    = await Donation.countDocuments({ donor: donorId, status: { $in: ['PENDING', 'NGO_ACCEPTED', 'VOLUNTEER_ASSIGNED', 'GOING_TO_PICKUP', 'IN_TRANSIT'] } });
    const completedDonationsCount = await Donation.countDocuments({ donor: donorId, status: 'COMPLETED' });
    const totalDonationsPosted    = await Donation.countDocuments({ donor: donorId });

    // Sum up total quantity ever donated by this donor
    const quantityAgg = await Donation.aggregate([
      { $match: { donor: donorId } },
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

/**
 * @desc    Volunteer claims/accepts a pickup request
 * @route   PUT /api/donations/:id/assign-volunteer
 * @access  Private (VOLUNTEER only)
 */
export const assignVolunteer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'VOLUNTEER') {
      return res.status(403).json({ success: false, message: 'Only registered volunteers can claim pickup tasks.' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    if (donation.status !== 'NGO_ACCEPTED') {
      return res.status(400).json({ success: false, message: 'Donation is not in a claimable state for volunteers.' });
    }

    donation.volunteer = req.user._id;
    donation.status = 'VOLUNTEER_ASSIGNED';
    donation.statusHistory.push({ status: 'VOLUNTEER_ASSIGNED', updatedBy: req.user._id, updatedAt: new Date() });
    await donation.save();

    // Re-fetch fully populated donation so response & socket payload have all nested objects
    const populatedDonation = await Donation.findById(donation._id)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture ngoAcceptedCategories location')
      .populate('volunteer', 'name email phoneNumber profilePicture')
      .populate('cancelledBy', 'name email profilePicture');

    // Broadcast update
    SocketService.broadcast('donation_updated', populatedDonation);

    // Notify Donor & NGO
    const donorIdStr = donation.donor.toString();
    await SocketService.sendSystemNotification(donorIdStr, {
      title: 'Volunteer Assigned!',
      message: `Volunteer "${req.user.name}" has been assigned to pick up your donation of "${donation.foodName}".`,
      type: 'VERIFICATION_UPDATE',
      relatedId: donation._id.toString(),
    });

    if (donation.ngo) {
      const ngoIdStr = donation.ngo.toString();
      await SocketService.sendSystemNotification(ngoIdStr, {
        title: 'Volunteer Assigned to Pickup!',
        message: `Volunteer "${req.user.name}" has accepted the pickup task for "${donation.foodName}".`,
        type: 'VERIFICATION_UPDATE',
        relatedId: donation._id.toString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Volunteer assigned successfully.',
      donation: populatedDonation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    NGO logs food distribution details and completes the donation cycle
 * @route   PUT /api/donations/:id/distribute
 * @access  Private (NGO only)
 */
export const distributeDonation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'NGO') {
      return res.status(403).json({ success: false, message: 'Only verified organizations can distribute food.' });
    }

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found.' });
    }

    const { distributedQuantity, beneficiariesCount, location, notes } = req.body;

    if (distributedQuantity === undefined || beneficiariesCount === undefined || !location) {
      return res.status(400).json({ success: false, message: 'Please provide all distribution metrics.' });
    }

    donation.distribution = {
      distributedQuantity: Number(distributedQuantity),
      beneficiariesCount: Number(beneficiariesCount),
      distributionDate: new Date(),
      location,
      remainingQuantity: Math.max(0, donation.quantity - Number(distributedQuantity)),
      notes: notes || '',
    };

    donation.status = 'DISTRIBUTED';
    donation.statusHistory.push({ status: 'DISTRIBUTED', updatedBy: req.user._id, updatedAt: new Date() });
    await donation.save();

    // Trace intermediate redistributing status
    donation.status = 'REDISTRIBUTED_TO_BENEFICIARIES';
    donation.statusHistory.push({ status: 'REDISTRIBUTED_TO_BENEFICIARIES', updatedBy: req.user._id, updatedAt: new Date() });
    await donation.save();

    // Trigger completion
    donation.status = 'COMPLETED';
    donation.statusHistory.push({ status: 'COMPLETED', updatedBy: req.user._id, updatedAt: new Date() });
    await donation.save();

    // Re-fetch fully populated donation for response & socket broadcast
    const populatedDonation = await Donation.findById(donation._id)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture ngoAcceptedCategories location')
      .populate('volunteer', 'name email phoneNumber profilePicture')
      .populate('cancelledBy', 'name email profilePicture');

    // Calculate donor points & streak updates
    const donor = await User.findById(donation.donor);
    if (donor) {
      const mealsAdded = donation.quantity * (donation.unit.toLowerCase().includes('serv') ? 1 : 4);
      const co2Added = parseFloat((donation.quantity * 2.5).toFixed(1));
      
      donor.mealsSaved += mealsAdded;
      donor.co2Reduction += co2Added;
      donor.impactPoints += Math.round(mealsAdded * 10);

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
      donor.trustScore = Math.min(100, donor.trustScore + 2);
      await donor.save();

      // Notify donor about trust score increase
      await SocketService.sendSystemNotification(donor.id, {
        title: '⭐ Trust Score Increased!',
        message: `Great work! Your Trust Score has increased to ${donor.trustScore}% for completing a full donation cycle.`,
        type: 'TRUST_SCORE_UPDATE',
        relatedId: donation._id.toString(),
      });
    }

    // Notify Donor & NGO
    const donorIdStr = donation.donor.toString();
    await SocketService.sendSystemNotification(donorIdStr, {
      title: 'Donation Completed & Distributed! 🎉',
      message: `Thank you! Your donation of "${donation.foodName}" has been successfully distributed to ${beneficiariesCount} beneficiaries.`,
      type: 'DELIVERY_COMPLETED',
      relatedId: donation._id.toString(),
    });

    const ngoIdStr = donation.ngo ? donation.ngo.toString() : '';
    if (ngoIdStr) {
      await SocketService.sendSystemNotification(ngoIdStr, {
        title: 'Food Distribution Logged!',
        message: `You have successfully distributed "${donation.foodName}" to ${beneficiariesCount} beneficiaries.`,
        type: 'DELIVERY_COMPLETED',
        relatedId: donation._id.toString(),
      });
    }

    // Broadcast update
    SocketService.broadcast('donation_updated', populatedDonation);

    res.status(200).json({
      success: true,
      message: 'Distribution details logged and donation marked as completed.',
      donation: populatedDonation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update/Edit food donation details
 * @route   PUT /api/donations/:id
 * @access  Private (Donor or Admin only)
 */
export const updateDonation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found.' });
    }

    const isOwner = donation.donor.toString() === req.user?._id.toString();
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit this donation.' });
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
      specialInstructions,
    } = req.body;

    if (foodName) donation.foodName = foodName;
    if (foodCategory) donation.foodCategory = foodCategory;
    if (quantity) donation.quantity = Number(quantity);
    if (unit) donation.unit = unit;
    if (preparationTime) donation.preparationTime = new Date(preparationTime);
    if (estimatedExpiryTime) {
      const expiryDate = new Date(estimatedExpiryTime);
      if (expiryDate.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: 'Estimated expiry time must be in the future.' });
      }
      donation.estimatedExpiryTime = expiryDate;
    }
    if (storageCondition) donation.storageCondition = storageCondition;
    if (pickupAddress) donation.pickupAddress = pickupAddress;
    if (specialInstructions !== undefined) donation.specialInstructions = specialInstructions;

    if (coordinates) {
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return res.status(400).json({ success: false, message: 'Invalid coordinates. Expected [lng, lat]' });
      }
      donation.location = {
        type: 'Point',
        coordinates: [Number(coordinates[0]), Number(coordinates[1])],
      };
    }

    // Trigger AI prediction if relevant fields changed
    if (foodCategory || preparationTime || estimatedExpiryTime || storageCondition) {
      try {
        const aiPrediction = await AIService.predictExpiry({
          foodCategory: donation.foodCategory,
          preparationTime: donation.preparationTime,
          estimatedExpiryTime: donation.estimatedExpiryTime,
          storageCondition: donation.storageCondition,
        });
        donation.aiSafeWindowHours = aiPrediction.aiSafeWindowHours;
        donation.aiFreshnessScore = aiPrediction.aiFreshnessScore;
        donation.aiRiskLevel = aiPrediction.aiRiskLevel;
        donation.aiRecommendation = aiPrediction.aiRecommendation;
      } catch (aiErr) {
        console.warn('AI Predict error during update, keeping existing values or using default fallbacks');
      }
    }

    await donation.save();

    // Trigger System Notifications for edited details
    const donorIdStr = donation.donor.toString();
    const ngoIdStr = donation.ngo ? donation.ngo.toString() : '';
    const volIdStr = donation.volunteer ? donation.volunteer.toString() : '';

    if (ngoIdStr) {
      await SocketService.sendSystemNotification(ngoIdStr, {
        title: 'Assigned Donation Updated 📝',
        message: `Donor updated details for "${donation.foodName}". Review quantity (${donation.quantity} ${donation.unit}) or expiry time.`,
        type: 'DONATION_ACCEPTED',
        relatedId: donation._id.toString(),
      });
    } else {
      // If PENDING, notify matched nearby NGOs
      const [donLng, donLat] = donation.location.coordinates;
      const ngos = await User.find({ role: 'NGO', isBlocked: false, approvalStatus: 'approved' });
      for (const ngo of ngos) {
        if (ngo.location?.coordinates) {
          const [ngoLng, ngoLat] = ngo.location.coordinates;
          const distance = LocationService.calculateDistance(donLat, donLng, ngoLat, ngoLng);
          if (distance <= 15) {
            await SocketService.sendSystemNotification(ngo._id.toString(), {
              title: 'Nearby Food Listing Updated 📝',
              message: `Listing "${donation.foodName}" nearby has been updated by the donor. Review updated details.`,
              type: 'NEW_DONATION',
              relatedId: donation._id.toString(),
            });
          }
        }
      }
    }

    if (volIdStr) {
      await SocketService.sendSystemNotification(volIdStr, {
        title: 'Assigned Pickup Updated 📝',
        message: `Pickup details for "${donation.foodName}" have been updated by the donor. Review updated quantities or location.`,
        type: 'DONATION_ACCEPTED',
        relatedId: donation._id.toString(),
      });
    }

    // Re-fetch fully populated donation for response & socket broadcast
    const populatedDonation = await Donation.findById(donation._id)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture ngoAcceptedCategories location')
      .populate('volunteer', 'name email phoneNumber profilePicture')
      .populate('cancelledBy', 'name email profilePicture');

    // Broadcast update
    SocketService.broadcast('donation_updated', populatedDonation);

    res.status(200).json({
      success: true,
      message: 'Donation updated successfully.',
      donation: populatedDonation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Volunteer cancels active claimed/pickup task
 * @route   PUT /api/donations/:id/volunteer-cancel
 * @access  Private (Volunteer only)
 */
export const volunteerCancelDonation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation record not found.' });
    }

    if (!donation.volunteer || donation.volunteer.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized. You are not assigned to this pickup.' });
    }

    const activePickupStages = ['NGO_ACCEPTED', 'VOLUNTEER_ASSIGNED', 'GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'];
    if (!activePickupStages.includes(donation.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel pickup at this stage.' });
    }

    const { reason, proofPhoto } = req.body;
    if (!reason || !proofPhoto) {
      return res.status(400).json({ success: false, message: 'Cancellation reason and proof photo are required.' });
    }

    donation.status = 'CANCELLED';
    donation.cancelledBy = req.user?._id as any;
    donation.cancelledByRole = 'VOLUNTEER';
    donation.cancellationReason = reason;
    donation.cancellationProof = proofPhoto;
    donation.cancelledAt = new Date();
    donation.statusHistory.push({ status: 'CANCELLED', updatedBy: req.user?._id as any, updatedAt: new Date() });

    await donation.save();

    const donorIdStr = donation.donor.toString();
    const ngoIdStr = donation.ngo ? donation.ngo.toString() : '';
    const volName = req.user?.name || 'Volunteer';

    // 1. Notify Donor
    await SocketService.sendSystemNotification(donorIdStr, {
      title: 'Food Pickup Cancelled ⚠️',
      message: `Volunteer "${volName}" cancelled the pickup for "${donation.foodName}". Reason: "${reason}"`,
      type: 'DONATION_CANCELLED',
      relatedId: donation._id.toString(),
    });

    // 2. Notify NGO
    if (ngoIdStr) {
      await SocketService.sendSystemNotification(ngoIdStr, {
        title: 'Food Pickup Cancelled ⚠️',
        message: `Volunteer "${volName}" cancelled the pickup for "${donation.foodName}". Reason: "${reason}"`,
        type: 'DONATION_CANCELLED',
        relatedId: donation._id.toString(),
      });
    }

    // 3. Notify Admin
    const admins = await User.find({ role: 'ADMIN' });
    for (const admin of admins) {
      await SocketService.sendSystemNotification(admin._id.toString(), {
        title: 'Food Pickup Cancelled ⚠️',
        message: `Volunteer "${volName}" cancelled the pickup for "${donation.foodName}". Reason: "${reason}"`,
        type: 'DONATION_CANCELLED',
        relatedId: donation._id.toString(),
      });
    }

    // Re-fetch fully populated donation for response & socket broadcast
    const populatedDonation = await Donation.findById(donation._id)
      .populate('donor', 'name email trustScore profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture ngoAcceptedCategories location')
      .populate('volunteer', 'name email phoneNumber profilePicture')
      .populate('cancelledBy', 'name email profilePicture');

    // Broadcast update
    SocketService.broadcast('donation_updated', populatedDonation);

    res.status(200).json({
      success: true,
      message: 'Pickup task cancelled successfully.',
      donation: populatedDonation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Repair corrupted donation records with [0,0] coordinates
 * @route   POST /api/donations/repair-coordinates
 * @access  Private (ADMIN or DONOR)
 */
export const repairCorruptedCoordinates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const corruptedDonations = await Donation.find({
      $or: [
        { 'location.coordinates': [0, 0] },
        { location: { $exists: false } },
        { 'location.coordinates': { $exists: false } }
      ]
    });

    let repairedCount = 0;
    const details = [];

    for (const don of corruptedDonations) {
      if (!don.pickupAddress) continue;
      
      try {
        const query = encodeURIComponent(don.pickupAddress);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=jsonv2&addressdetails=1&limit=1&countrycodes=in`;
        
        const nomRes = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'FoodBridge-AI/1.0 (contact: support@foodbridge.local)'
          }
        });

        if (nomRes.ok) {
          const data: any = await nomRes.json();
          if (Array.isArray(data) && data.length > 0) {
            const fetchedLat = parseFloat(data[0].lat);
            const fetchedLng = parseFloat(data[0].lon);

            if (!isNaN(fetchedLat) && !isNaN(fetchedLng) && (fetchedLat !== 0 || fetchedLng !== 0)) {
              don.location = {
                type: 'Point',
                coordinates: [fetchedLng, fetchedLat]
              };
              await don.save();
              repairedCount++;
              details.push({ id: don._id, address: don.pickupAddress, newCoords: [fetchedLng, fetchedLat] });
            }
          }
        } else {
          // Hard set to fixed SCAD Thandalam location
          don.pickupAddress = 'Saveetha College of Architecture and Design (SCAD), Thandalam, Sriperumbudur, Tamil Nadu, India';
          don.location = { type: 'Point', coordinates: [80.016108, 13.028344] };
          await don.save();
          repairedCount++;
        }
        // Respect Nominatim rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`Failed to repair donation ${don._id}:`, err);
      }
    }

    res.status(200).json({
      success: true,
      message: `Repaired ${repairedCount} corrupted donation records.`,
      repairedCount,
      details
    });
  } catch (error) {
    next(error);
  }
};

