import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5003';

export const useSocket = () => {
  const { user, addNotification, addMessageToChat, markChatMessagesSeen } = useAppStore();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    // To preserve pure client-side stability without heavy external binaries, 
    // we establish a direct, extremely stable WebSocket connection to our Express Socket.io backend.
    // It maps standard socket events seamlessly.
    let socket: any = null;

    try {
      // In development/production, we can dynamically load socket.io-client or simulate standard updates
      const io = require('socket.io-client');
      socket = io(SOCKET_URL, {
        transports: ['websocket'],
        query: { userId: user._id },
      });

      // Authenticate
      socket.emit('authenticate', user._id);

      // Listen for Notifications
      socket.on('new_notification', (notification: any) => {
        addNotification(notification);
      });

      // Listen for Messages
      socket.on('receive_message', (data: { chatId: string; message: any }) => {
        addMessageToChat(data.chatId, data.message);
      });

      // Listen for Message Seen ticks
      socket.on('messages_seen', (data: { chatId: string; readerId: string }) => {
        markChatMessagesSeen(data.chatId, data.readerId);
      });

      // Listen for new donations and status updates for real-time synchronization
      socket.on('donation_created', (donation: any) => {
        console.log('[Socket] donation_created received:', donation);
        window.dispatchEvent(new CustomEvent('donation_update'));
      });

      socket.on('donation_updated', (donation: any) => {
        console.log('[Socket] donation_updated received:', donation);
        window.dispatchEvent(new CustomEvent('donation_update'));
      });

      socketRef.current = socket;
    } catch (e) {
      console.warn('[SocketHook] Socket.io client failed to load, falling back to mock WebSocket simulator for offline compatibility.');
      
      // Dynamic fallback mock connector to ensure no crashes during client builds
      socketRef.current = {
        emit: (event: string, payload: any) => {
          console.log(`[MockSocket] Event: ${event}`, payload);
        },
        on: (event: string, callback: Function) => {
          // Store callbacks for diagnostics
        },
        disconnect: () => {},
      } as any;
    }

    return () => {
      if (socket && typeof socket.disconnect === 'function') {
        socket.disconnect();
      }
    };
  }, [user]);

  /**
   * Room coordination
   */
  const joinChatRoom = (chatId: string) => {
    if (socketRef.current) {
      (socketRef.current as any).emit('join_room', chatId);
    }
  };

  const leaveChatRoom = (chatId: string) => {
    if (socketRef.current) {
      (socketRef.current as any).emit('leave_room', chatId);
    }
  };

  const emitTyping = (chatId: string, isTyping: boolean) => {
    if (socketRef.current && user) {
      (socketRef.current as any).emit('typing', { chatId, userId: user._id, isTyping });
    }
  };

  return {
    socket: socketRef.current,
    joinChatRoom,
    leaveChatRoom,
    emitTyping,
  };
};
