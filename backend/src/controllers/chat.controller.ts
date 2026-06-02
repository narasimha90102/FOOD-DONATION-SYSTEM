import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { Chat } from '../models/Chat';
import { SocketService } from '../services/socket.service';

/**
 * @desc    Get user's chat rooms (Donor sees NGO list, NGO sees Donor list)
 * @route   GET /api/chats
 * @access  Private
 */
export const getChats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const query = req.user?.role === 'DONOR' ? { donor: userId } : { ngo: userId };

    const chats = await Chat.find(query)
      .populate('donation', 'foodName foodCategory quantity unit status')
      .populate('donor', 'name email profilePicture ratingAverage')
      .populate('ngo', 'name email address profilePicture')
      .sort({ lastMessageAt: -1 });

    res.status(200).json({
      success: true,
      count: chats.length,
      chats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get specific chat room messages & clear unread notifications
 * @route   GET /api/chats/:id
 * @access  Private
 */
export const getChatMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId)
      .populate('donation', 'foodName status')
      .populate('donor', 'name email profilePicture')
      .populate('ngo', 'name email profilePicture address');

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat room not found.' });
    }

    // Check participation authorization
    const isDonor = chat.donor.toString() === req.user?._id.toString();
    const isNgo = chat.ngo.toString() === req.user?._id.toString();
    if (!isDonor && !isNgo) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this conversation.' });
    }

    // Mark other user's messages in this room as seen
    let updated = false;
    chat.messages.forEach((msg) => {
      if (msg.sender.toString() !== req.user?._id.toString() && !msg.seen) {
        msg.seen = true;
        updated = true;
      }
    });

    if (updated) {
      await chat.save();
      // Notify other user's web sockets of reading action
      SocketService.emitToRoom(chatId, 'messages_seen', { chatId, readerId: req.user?._id });
    }

    res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a message within a chat room
 * @route   POST /api/chats/:id/messages
 * @access  Private
 */
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chatId = req.params.id;
    const { text, imageUrl } = req.body;

    if (!text && !imageUrl) {
      return res.status(400).json({ success: false, message: 'Message content or image attachment is required.' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat room does not exist.' });
    }

    const senderId = req.user?._id;
    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const recipientId = senderId.toString() === chat.donor.toString() ? chat.ngo.toString() : chat.donor.toString();

    // Create the message object
    const newMessage = {
      sender: senderId,
      text: text || '',
      imageUrl: imageUrl || '',
      seen: false,
      createdAt: new Date(),
    };

    chat.messages.push(newMessage as any);
    chat.lastMessageAt = new Date();
    await chat.save();

    // Fetch inserted message to get full object properties (like _id)
    const insertedMsg = chat.messages[chat.messages.length - 1];

    // Emit live via socket.io
    SocketService.emitToRoom(chatId, 'receive_message', {
      chatId,
      message: insertedMsg,
    });

    // Send push notification if recipient is offline, or as standard alert log
    const senderName = req.user?.name || 'User';
    await SocketService.sendSystemNotification(recipientId, {
      title: `New message from ${senderName}`,
      message: text ? (text.length > 40 ? text.substring(0, 37) + '...' : text) : 'Sent an image.',
      type: 'CHAT',
      relatedId: chatId,
    });

    res.status(201).json({
      success: true,
      message: insertedMsg,
    });
  } catch (error) {
    next(error);
  }
};
