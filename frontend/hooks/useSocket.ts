import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

const getSocketUrl = (): string => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL && !process.env.NEXT_PUBLIC_SOCKET_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname)) {
        return `http://${window.location.hostname}:5003`;
      }
    }
  }
  return 'http://localhost:5003';
};

export const useSocket = () => {
  const {
    user,
    addNotification,
    deleteNotification,
    deleteAllNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    addMessageToChat,
    markChatMessagesSeen,
  } = useAppStore();
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    let socket: any = null;

    try {
      const io = require('socket.io-client');
      socket = io(getSocketUrl(), {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnectionAttempts: 10,
        query: { userId: user._id },
      });

      // Authenticate
      socket.emit('authenticate', user._id);

      // Listen for Notifications (Dual event names)
      socket.on('new_notification', (notification: any) => {
        addNotification(notification);
      });
      socket.on('notification:created', (notification: any) => {
        addNotification(notification);
      });

      // Listen for Notification Deletion in real-time
      socket.on('notification_deleted', (data: { notificationId: string }) => {
        if (data?.notificationId) {
          deleteNotification(data.notificationId);
        }
      });
      socket.on('notification:deleted', (data: { notificationId: string }) => {
        if (data?.notificationId) {
          deleteNotification(data.notificationId);
        }
      });

      // Listen for Notification Read
      socket.on('notification_read', (data: { notificationId?: string }) => {
        if (data?.notificationId) {
          markNotificationRead(data.notificationId);
        } else {
          markAllNotificationsRead();
        }
      });
      socket.on('notification:read', (data: { notificationId?: string }) => {
        if (data?.notificationId) {
          markNotificationRead(data.notificationId);
        } else {
          markAllNotificationsRead();
        }
      });

      // Listen for Notification Clear
      socket.on('notification_cleared', () => {
        deleteAllNotifications();
      });
      socket.on('notification:cleared', () => {
        deleteAllNotifications();
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
      const triggerDonationSync = (donation: any) => {
        console.log('[Socket] donation event received:', donation);
        window.dispatchEvent(new CustomEvent('donation_update', { detail: donation }));
      };

      socket.on('donation_created', triggerDonationSync);
      socket.on('donation:created', triggerDonationSync);
      socket.on('donation_updated', triggerDonationSync);
      socket.on('donation:updated', triggerDonationSync);
      socket.on('donation:statusChanged', triggerDonationSync);
      socket.on('donation_cancelled', triggerDonationSync);
      socket.on('donation:cancelled', triggerDonationSync);

      socket.on('volunteer_location_changed', (data: any) => {
        console.log('[Socket] volunteer_location_changed received:', data);
        window.dispatchEvent(new CustomEvent(`volunteer_location_${data.donationId}`, { detail: data.coordinates }));
      });
      socket.on('volunteer:locationUpdated', (data: any) => {
        window.dispatchEvent(new CustomEvent(`volunteer_location_${data.donationId}`, { detail: data.coordinates }));
      });

      socketRef.current = socket;
    } catch (e) {
      console.warn('[SocketHook] Socket.io client failed to load, falling back to mock WebSocket simulator for offline compatibility.');
      socketRef.current = {
        emit: (event: string, payload: any) => {
          console.log(`[MockSocket] Event: ${event}`, payload);
        },
        on: () => {},
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

  const emitLocationUpdate = (donationId: string, coordinates: [number, number]) => {
    if (socketRef.current) {
      (socketRef.current as any).emit('volunteer_location_update', { donationId, coordinates });
    }
  };

  return {
    socket: socketRef.current,
    joinChatRoom,
    leaveChatRoom,
    emitTyping,
    emitLocationUpdate,
  };
};

