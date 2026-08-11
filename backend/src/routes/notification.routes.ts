import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from '../controllers/notification.controller';
import { protect } from '../middlewares/auth';

const router = Router();

// Secure all notification endpoints
router.use(protect);

router.get('/', getNotifications);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/', deleteAllNotifications);
router.delete('/:id', deleteNotification);

export default router;
