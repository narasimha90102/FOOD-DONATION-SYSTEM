import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Notification } from '../models/Notification';

/**
 * @desc    Get user notifications (paginated, sorted by latest)
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query = { recipient: req.user?._id };

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    // Authorization check
    if (notification.recipient.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this notification.' });
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all user notifications as read
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const query = { recipient: req.user?._id, read: false };

    await Notification.updateMany(query, { $set: { read: true } });

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};
