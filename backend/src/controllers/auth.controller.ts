import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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
    const { name, email, password, role, address, coordinates, businessRegistrationNumber, phoneNumber } = req.body;

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
      phoneNumber: phoneNumber || '',
      location: locationData,
      businessRegistrationNumber: businessRegistrationNumber || '',
      isVerified: true,
      trustScore: 80,
      volunteerAvailability: role === 'VOLUNTEER' ? 'AVAILABLE' : undefined,
      volunteerStatus: role === 'VOLUNTEER' ? 'ACTIVE' : undefined,
    });

    console.log(`[Auth] New user registered successfully: ${user.email} (Role: ${user.role})`);

    // Return token directly — user is immediately active
    if (role === 'NGO' || role === 'VOLUNTEER') {
      return res.status(201).json({
        success: true,
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Registration successful. Your account is currently waiting for admin approval. You will be able to login after the administrator approves your account.',
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (error: any) {
    console.error(`[Auth] Registration Failed: ${error.message}`, error);
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

    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Your account is waiting for admin approval. Please try again after your account is approved.',
      });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_REJECTED',
        message: `Your ${user.role.toLowerCase()} account has not been approved by the administrator.`,
      });
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

    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Your account is waiting for admin approval. Please try again after your account is approved.',
      });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_REJECTED',
        message: `Your ${user.role.toLowerCase()} account has not been approved by the administrator.`,
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate forgot password — generates secure URL token & sends reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your registered email address.' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Security: always return 200 to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a reset link has been sent.',
      });
    }

    // Generate a cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Store hashed version in DB (raw token goes in the email link)
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Build the reset URL
    const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${rawToken}`;

    const emailSent = await EmailService.sendPasswordResetLink(user.email, user.name, resetUrl);
    if (!emailSent) {
      // Rollback token on email failure
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ success: false, message: 'Error sending reset email. Please try again.' });
    }

    res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Complete password reset using the URL token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide a reset token and a new password.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    // Hash the incoming token and compare against DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Update password (Mongoose pre-save hook hashes it)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
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


export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User matching credentials not found.' });
    }

    const { name, address, phoneNumber, coordinates, profilePicture, ngoDocumentUrl, ngoCapacity, ngoAcceptedCategories, volunteerAvailability, volunteerStatus } = req.body;

    if (name) user.name = name;
    if (address) user.address = address;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
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

    // Volunteer specific properties update
    if (user.role === 'VOLUNTEER') {
      if (volunteerAvailability) user.volunteerAvailability = volunteerAvailability;
      if (volunteerStatus) user.volunteerStatus = volunteerStatus;
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

/**
 * @desc    Self delete user account (Available after 24 real hours from creation)
 * @route   DELETE /api/auth/delete-account
 * @access  Private
 */
export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Protect last admin
    if (user.role === 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'At least one administrator account must remain.',
        });
      }
    }

    // 24 real hours check
    const createdAtTime = new Date((user as any).createdAt).getTime();
    const nowTime = Date.now();
    const hoursDifference = (nowTime - createdAtTime) / (1000 * 60 * 60);

    if (hoursDifference < 24) {
      const hoursRemaining = (24 - hoursDifference).toFixed(1);
      return res.status(400).json({
        success: false,
        message: `Account deletion is available only after 24 hours from account creation. Please try again in ${hoursRemaining} hours.`,
      });
    }

    await User.findByIdAndDelete(req.user?._id);

    res.status(200).json({
      success: true,
      message: 'Your account has been permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
};

