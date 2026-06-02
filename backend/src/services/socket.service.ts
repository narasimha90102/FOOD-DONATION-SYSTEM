import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';
import { Notification } from '../models/Notification';

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
        origin: env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
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
   * Emits a real-time message to a specific chat room.
   */
  public static emitToRoom(room: string, event: string, payload: any): void {
    if (this.io) {
      this.io.to(room).emit(event, payload);
    }
  }

  /**
   * Pushes a database notification to a specific user and logs it in the database.
   */
  public static async sendSystemNotification(
    recipientId: string,
    notificationData: {
      title: string;
      message: string;
      type: 'NEW_DONATION' | 'DONATION_ACCEPTED' | 'PICKUP_STARTED' | 'DELIVERY_COMPLETED' | 'EXPIRY_WARNING' | 'VERIFICATION_UPDATE' | 'CHAT';
      relatedId?: string;
    }
  ): Promise<void> {
    try {
      // Save notification to DB
      const notification = await Notification.create({
        recipient: recipientId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        relatedId: notificationData.relatedId,
      });

      console.log(`[Notification] Saved: ${notification.title} for user ${recipientId}`);

      // Emit to user's web socket channel
      if (this.io) {
        this.io.to(recipientId).emit('new_notification', notification);
        console.log(`[Socket] Emitted new_notification to user ${recipientId}`);
      }
    } catch (err) {
      console.error('[Notification] Failed to create or emit notification:', err);
    }
  }

  /**
   * Checks if a user is online.
   */
  public static isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size || 0) > 0;
  }
}
