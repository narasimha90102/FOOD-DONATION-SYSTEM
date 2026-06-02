import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { EmailService } from '../services/email.service';
import { AuthRequest } from '../middlewares/auth';
import { IUser } from '../types';

/**
 * Utility: Generates dynamic 6-digit numeric codes
 */
const generateNumericCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Utility: Signs Access & Refresh JWTs and yields auth profile data
 */
const sendTokenResponse = (user: IUser, statusCode: number, res: Response) => {
  const token = jwt.sign({ id: user._id.toString() }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRE as any,
  });

  const refreshToken = jwt.sign({ id: user._id.toString() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRE as any,
  });

  // Strip password reference before return
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    token,
    refreshToken,
    user: userObj,
  });
};

/**
 * @desc    Register a new user (Donor or NGO)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, address, coordinates, businessRegistrationNumber } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Build location coordinates if provided
    let locationData = { type: 'Point' as const, coordinates: [0, 0] as [number, number] };
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      locationData = {
        type: 'Point' as const,
        coordinates: [Number(coordinates[0]), Number(coordinates[1])] as [number, number],
      };
    }

    // Create User record — verified immediately, no OTP step
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'DONOR',
      address: address || '',
      location: locationData,
      businessRegistrationNumber: businessRegistrationNumber || '',
      isVerified: true,
      trustScore: 80,
    });

    // Return token directly — user is immediately active
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email address using registration code
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Please provide email and verification code.' });
    }

    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Verification code is invalid or has expired.' });
    }

    // Set verified flag and flush temporary codes
    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    
    // Automatically set default trust score booster for verification
    user.trustScore = 90;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
    }

    // Fetch user and select the password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Password or email is incorrect.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'This account has been suspended.' });
    }

    // Match password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Password or email is incorrect.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Google Sign In Integration
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, googleIdToken, role, profilePicture } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email scope is required from Google Authenticator.' });
    }

    // Find or Auto-Create User
    let user = await User.findOne({ email });

    if (!user) {
      // Build dummy location coordinates
      const locationData = { type: 'Point' as const, coordinates: [0, 0] as [number, number] };
      
      user = await User.create({
        name: name || 'Google User',
        email,
        // Set dynamic strong password for Google users as they won't use direct forms
        password: Math.random().toString(36).slice(-10) + 'GoOgLe#2026',
        role: role || 'DONOR',
        isVerified: true, // Google verifies user emails natively
        profilePicture: profilePicture || '',
        location: locationData,
        trustScore: 88,
      });
      console.log(`[GoogleAuth] Successfully auto-registered Google user: ${email}`);
    } else {
      if (user.isBlocked) {
        return res.status(403).json({ success: false, message: 'This account has been suspended.' });
      }
      // Update profile picture if empty
      if (!user.profilePicture && profilePicture) {
        user.profilePicture = profilePicture;
        await user.save();
      }
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate forgot password trigger
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered user found with this email.' });
    }

    const resetCode = generateNumericCode();
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const emailSent = await EmailService.sendResetPasswordCode(user.email, resetCode);
    if (!emailSent) {
      return res.status(500).json({ success: false, message: 'Error sending password reset email. Please try again.' });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset code successfully sent to email.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete forgot password reset
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide email, reset code, and your new password.' });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Password reset code is invalid or has expired.' });
    }

    // Set new password (Mongoose pre-save hooks will encrypt automatically)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please login with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve logged-in user profile details
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // protect middleware already verified and attached req.user
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update logged-in user profile details
 * @route   PUT /api/auth/update
 * @access  Private
 */
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User matching credentials not found.' });
    }

    const { name, address, coordinates, profilePicture, ngoDocumentUrl, ngoCapacity, ngoAcceptedCategories } = req.body;

    if (name) user.name = name;
    if (address) user.address = address;
    if (profilePicture) user.profilePicture = profilePicture;

    // NGO specific properties update
    if (user.role === 'NGO') {
      if (ngoDocumentUrl) {
        user.ngoDocumentUrl = ngoDocumentUrl;
        // If they update document, set status back to PENDING for admin re-verification
        user.ngoVerificationStatus = 'PENDING';
      }
      if (ngoCapacity) user.ngoCapacity = Number(ngoCapacity);
      if (ngoAcceptedCategories && Array.isArray(ngoAcceptedCategories)) {
        user.ngoAcceptedCategories = ngoAcceptedCategories;
      }
    }

    // Location coordinates updates
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      user.location = {
        type: 'Point',
        coordinates: [Number(coordinates[0]), Number(coordinates[1])] as [number, number],
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};
