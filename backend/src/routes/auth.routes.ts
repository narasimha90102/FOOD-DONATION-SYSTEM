import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
} from '../controllers/auth.controller';
import { protect, authLimiter } from '../middlewares/auth';

const router = Router();

// Public auth endpoints with throttling safety
router.post('/register', authLimiter, register);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/login', authLimiter, login);
router.post('/google', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Private profile endpoints
router.get('/me', protect, getMe);
router.put('/update', protect, updateProfile);

export default router;
