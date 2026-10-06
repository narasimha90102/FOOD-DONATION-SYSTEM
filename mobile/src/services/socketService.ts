import { io, Socket } from 'socket.io-client';
import { getActiveSocketUrl } from '../config/env';

/**
 * Centralized Socket.io singleton for FoodBridge AI mobile app.
 * Automatically buffers and binds listeners even if registered before socket connection.
 */
class SocketServiceClass {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private eventHandlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  /**
   * Connects the socket and authenticates for private notifications.
   */
  connect(userId: string): Socket {
    if (this.socket?.connected && this.userId === userId) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.userId = userId;

    this.socket = io(getActiveSocketUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log(`[Socket] Connected as ${userId} on socket ${this.socket?.id}`);
      this.socket?.emit('authenticate', userId);
      this.bindAllHandlers();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${reason}`);
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts`);
      if (this.userId) {
        this.socket?.emit('authenticate', this.userId);
        this.bindAllHandlers();
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn(`[Socket] Connection error: ${err.message}`);
    });

    return this.socket;
  }

  private bindAllHandlers() {
    if (!this.socket) return;
    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        this.socket?.off(event, handler);
        this.socket?.on(event, handler);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.off();
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    this.eventHandlers.clear();
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  joinRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_room', roomId);
    }
  }

  leaveRoom(roomId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_room', roomId);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args);
    }
  }

  emitVolunteerLocation(donationId: string, longitude: number, latitude: number): void {
    if (this.socket?.connected) {
      this.socket.emit('volunteer_location_update', {
        donationId,
        coordinates: [longitude, latitude],
      });
      this.socket.emit('volunteer:locationUpdated', {
        donationId,
        coordinates: [longitude, latitude],
      });
    }
  }

  /**
   * Register event listener. Buffers listener so it receives updates
   * even if registered before connection completes.
   */
  on(event: string, handler: (...args: any[]) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }

    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
      if (this.socket) {
        this.socket.off(event, handler);
      }
    };
  }

  emitTyping(chatId: string, userId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', { chatId, userId, isTyping });
    }
  }
}

export const SocketService = new SocketServiceClass();
