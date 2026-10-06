import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { LocationService } from './location.service';

export class SocketService {
  private static io: Server | null = null;
  // Map to store active user sockets: Map<userId, Set<socketId>>
  private static userSockets = new Map<string, Set<string>>();

  /**
   * Initializes the Socket.io Server instance.
   */
  public static initialize(server: HttpServer): Server {
    this.io = new Server(server, {
      cors: {
        origin: '*', // Allow all origins — web, mobile app, Expo, Android APK
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: false,
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // Handle Authentication / User binding
      socket.on('authenticate', (userId: string) => {
        if (!userId) return;
        socket.join(userId); // Join user's private notification channel
        
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)?.add(socket.id);
        console.log(`[Socket] User ${userId} authenticated on socket ${socket.id}`);
      });

      // Handle joining active chat rooms
      socket.on('join_room', (chatId: string) => {
        if (!chatId) return;
        socket.join(chatId);
        console.log(`[Socket] Socket ${socket.id} joined chat room: ${chatId}`);
      });

      // Handle leaving active chat rooms
      socket.on('leave_room', (chatId: string) => {
        if (!chatId) return;
        socket.leave(chatId);
        console.log(`[Socket] Socket ${socket.id} left chat room: ${chatId}`);
      });

      // Handle volunteer real-time location updates
      socket.on('volunteer_location_update', async (data: { donationId: string; coordinates: [number, number] }) => {
        const { donationId, coordinates } = data;
        if (!donationId || !coordinates) return;

        // Broadcast dual updates to clients tracking this donation
        socket.broadcast.emit('volunteer_location_changed', { donationId, coordinates });
        socket.broadcast.emit('volunteer:locationUpdated', { donationId, coordinates });
        
        // Update volunteer user's location in the database
        try {
          const { Donation } = await import('../models/Donation');
          const { User } = await import('../models/User');

          const donation = await Donation.findById(donationId);
          if (donation && donation.volunteer) {
            await User.findByIdAndUpdate(donation.volunteer, {
              'location.coordinates': coordinates
            });
          }
        } catch (err) {
          console.error('[Socket] Error updating volunteer position in DB:', err);
        }
      });

      // Handle messaging events (seen, typing)
      socket.on('typing', (data: { chatId: string; userId: string; isTyping: boolean }) => {
        socket.to(data.chatId).emit('typing_status', data);
      });

      // Handle manual disconnect
      socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        
        // Remove socket from userSocket cache
        for (const [userId, sockets] of this.userSockets.entries()) {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              this.userSockets.delete(userId);
            }
            console.log(`[Socket] Disassociated socket ${socket.id} from user ${userId}`);
            break;
          }
        }
      });
    });

    return this.io;
  }

  /**
   * Emits a real-time message to a specific room.
   */
  public static emitToRoom(room: string, event: string, payload: any): void {
    if (this.io) {
      this.io.to(room).emit(event, payload);
    }
  }

  /**
   * Broadcasts a real-time event to all targeted relevant connected clients (with dual-event support).
   */
  public static async broadcast(event: string, payload: any): Promise<void> {
    if (!this.io) return;

    try {
      const affectedUserIds = new Set<string>();

      // Extract coordinates & status if payload is a Donation object
      if (payload && payload._id) {
        if (payload.donor) affectedUserIds.add((payload.donor._id || payload.donor).toString());
        if (payload.ngo) affectedUserIds.add((payload.ngo._id || payload.ngo).toString());
        if (payload.volunteer) affectedUserIds.add((payload.volunteer._id || payload.volunteer).toString());

        // Find Admins to include them
        const admins = await User.find({ role: 'ADMIN' });
        for (const admin of admins) {
          affectedUserIds.add(admin._id.toString());
        }

        // If PENDING or new donation, include all active NGOs
        if (payload.status === 'PENDING') {
          const ngos = await User.find({ role: 'NGO', isBlocked: false, approvalStatus: 'approved' });
          for (const ngo of ngos) {
            affectedUserIds.add(ngo._id.toString());
          }
        }
      }

      // Compute canonical dual event names
      const eventsToEmit = [event];
      if (event === 'donation_created') eventsToEmit.push('donation:created');
      if (event === 'donation_updated') eventsToEmit.push('donation:updated', 'donation:statusChanged');
      if (event === 'donation_cancelled') eventsToEmit.push('donation:cancelled');

      // If no specific users isolated, broadcast globally to all sockets
      if (affectedUserIds.size === 0) {
        for (const ev of eventsToEmit) {
          this.io.emit(ev, payload);
        }
        return;
      }

      // Emit to targeted private user rooms AND broadcast event to ensure complete sync
      for (const userId of affectedUserIds) {
        for (const ev of eventsToEmit) {
          this.io.to(userId).emit(ev, payload);
        }
      }
      for (const ev of eventsToEmit) {
        this.io.emit(ev, payload);
      }
      console.log(`[Socket] Synchronized event [${eventsToEmit.join(', ')}] across clients.`);
    } catch (err) {
      console.error('[Socket] Targeted broadcast failed, fallback to global emit:', err);
      this.io.emit(event, payload);
    }
  }

  /**
   * Pushes a database notification to a specific user and emits in real-time.
   */
  public static async sendSystemNotification(
    recipientId: string,
    notificationData: {
      title: string;
      message: string;
      type:
        | 'NEW_DONATION'
        | 'DONATION_ACCEPTED'
        | 'DONATION_CANCELLED'
        | 'PICKUP_STARTED'
        | 'DELIVERY_COMPLETED'
        | 'EXPIRY_WARNING'
        | 'VERIFICATION_UPDATE'
        | 'TRUST_SCORE_UPDATE'
        | 'CHAT';
      relatedId?: string;
      recipientRole?: string;
      relatedType?: string;
      navigationRoute?: string;
    }
  ): Promise<void> {
    try {
      const recipientUser = await User.findById(recipientId);
      if (!recipientUser) {
        console.warn(`[Notification] Recipient ${recipientId} not found, skipping.`);
        return;
      }

      const notification = await Notification.create({
        recipient: recipientId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        relatedId: notificationData.relatedId,
        recipientRole: notificationData.recipientRole || recipientUser.role,
        relatedType: notificationData.relatedType,
        navigationRoute: notificationData.navigationRoute,
      });

      console.log(`[Notification] Saved: ${notification.title} for user ${recipientId} (${recipientUser.role})`);

      if (this.io) {
        this.io.to(recipientId).emit('new_notification', notification);
        this.io.to(recipientId).emit('notification:created', notification);
        console.log(`[Socket] Emitted new_notification to user ${recipientId}`);
      }
    } catch (err) {
      console.error('[Notification] Failed to create or emit notification:', err);
    }
  }

  /**
   * Real-time notification deletion sync.
   */
  public static emitNotificationDeleted(recipientId: string, notificationId: string): void {
    if (this.io) {
      this.io.to(recipientId).emit('notification_deleted', { notificationId });
      this.io.to(recipientId).emit('notification:deleted', { notificationId });
      console.log(`[Socket] Emitted notification_deleted for ${notificationId} to user ${recipientId}`);
    }
  }

  /**
   * Real-time notification read sync.
   */
  public static emitNotificationRead(recipientId: string, notificationId?: string): void {
    if (this.io) {
      this.io.to(recipientId).emit('notification_read', { notificationId });
      this.io.to(recipientId).emit('notification:read', { notificationId });
    }
  }

  /**
   * Real-time notification cleared sync.
   */
  public static emitNotificationCleared(recipientId: string): void {
    if (this.io) {
      this.io.to(recipientId).emit('notification_cleared', { recipientId });
      this.io.to(recipientId).emit('notification:cleared', { recipientId });
    }
  }

  /**
   * Checks if a user is online.
   */
  public static isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size || 0) > 0;
  }
}

