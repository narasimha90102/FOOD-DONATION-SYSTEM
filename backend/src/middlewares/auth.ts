import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { IUser } from '../types';
import rateLimit from 'express-rate-limit';

export interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Validates JWT access token and binds authenticated user to the request.
 */
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Retrieve token from Authorization header (Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route. Token missing.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };

    // Fetch user from DB
    const user = await User.findById(decoded.id).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User matching token no longer exists.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended by administration.' });
    }

    if (user.approvalStatus === 'pending') {
      return res.status(403).json({ success: false, message: 'Your account is waiting for admin approval. Please try again after your account is approved.' });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({ success: false, message: 'Your account has not been approved by the administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized. Token invalid or expired.' });
  }
};

/**
 * Restricts access to specific user roles.
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User credentials not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role (${req.user.role}) is unauthorized to execute this action.`,
      });
    }

    // Custom check: If role is NGO, verify their registration state is APPROVED
    if (req.user.role === 'NGO' && req.user.ngoVerificationStatus !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        ngoStatus: req.user.ngoVerificationStatus,
        message: 'Your organization is undergoing review. Access is locked until verification is APPROVED.',
      });
    }

    next();
  };
};

/**
 * Standard API Rate Limiter
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Account Onboarding Rate Limiter (highly strict)
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 auth requests per hour
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait an hour before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
