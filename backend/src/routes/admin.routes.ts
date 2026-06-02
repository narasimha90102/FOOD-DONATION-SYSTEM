import { Router } from 'express';
import { getAnalytics, getUsers, toggleBlockUser, verifyNGO } from '../controllers/admin.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Shield with Auth & ADMIN verification
router.use(protect);
router.use(authorize('ADMIN'));

router.get('/analytics', getAnalytics);
router.get('/users', getUsers);
router.put('/users/:id/block', toggleBlockUser);
router.put('/ngos/:id/verify', verifyNGO);

export default router;
