import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../store/useAppStore';
import { ApiService } from '../services/api';
import {
  Bell,
  Heart,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface NotificationItem {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  relatedId?: string;
  navigationRoute?: string;
  createdAt: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, markNotificationRead, deleteNotification, deleteAllNotifications, user } = useAppStore();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside of the dropdown container
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        // Don't close if clicking on the toggle button
        if (!target.closest('.bell-toggle-btn')) {
          onClose();
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMarkRead = async (notif: NotificationItem) => {
    try {
      // Optimistic state update
      markNotificationRead(notif._id);
      
      // API request
      await ApiService.put(`/notifications/${notif._id}/read`, {});

      // Custom routing based on notification details
      if (notif.relatedId) {
        if (notif.type === 'CHAT') {
          if (user?.role === 'NGO') {
            router.push(`/ngo/chat`);
          } else {
            router.push(`/donor/chat`);
          }
        } else if (
          ['NEW_DONATION', 'DONATION_ACCEPTED', 'DONATION_CANCELLED', 'PICKUP_STARTED', 'DELIVERY_COMPLETED', 'TRUST_SCORE_UPDATE'].includes(notif.type)
        ) {
          router.push(`/donations/${notif.relatedId}`);
        } else if (notif.type === 'VERIFICATION_UPDATE') {
          router.push(user?.role === 'NGO' ? `/ngo` : `/donor`);
        }
      } else if (notif.navigationRoute) {
        router.push(notif.navigationRoute);
      }
      onClose();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications?")) {
      return;
    }
    try {
      deleteAllNotifications();
      await ApiService.delete('/notifications');
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
    }
  };

  const handleDeleteOne = async (id: string) => {
    try {
      deleteNotification(id);
      await ApiService.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Helper to format time ago
  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Helper to get category icon and color
  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'NEW_DONATION':
        return { icon: Heart, color: 'text-brand-500 bg-brand-500/10' };
      case 'DONATION_ACCEPTED':
        return { icon: Sparkles, color: 'text-indigo-400 bg-indigo-500/10' };
      case 'PICKUP_STARTED':
        return { icon: Truck, color: 'text-sky-400 bg-sky-500/10' };
      case 'DELIVERY_COMPLETED':
        return { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10' };
      case 'EXPIRY_WARNING':
      case 'DONATION_CANCELLED':
        return { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10' };
      case 'VERIFICATION_UPDATE':
        return { icon: ShieldCheck, color: 'text-amber-400 bg-amber-500/10' };
      case 'CHAT':
        return { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10' };
      default:
        return { icon: Bell, color: 'text-slate-400 bg-white/5' };
    }
  };

  const latestNotifications = notifications.slice(0, 5);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl glass-panel p-4 shadow-2xl z-50 border border-white/10 animate-in fade-in slide-in-from-top-3 duration-200"
      style={{
        background: 'rgba(17, 24, 39, 0.9)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-white tracking-wide text-outfit">Notifications</h4>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="text-[10px] font-bold text-red-400 hover:text-red-500 flex items-center gap-1 transition-colors"
          >
            Delete All
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="py-2 max-h-[320px] overflow-y-auto divide-y divide-white/5 pr-1 scrollbar-thin">
        {latestNotifications.length > 0 ? (
          latestNotifications.map((notif) => {
            const config = getNotificationConfig(notif.type);
            const IconComponent = config.icon;

            return (
              <div
                key={notif._id}
                className={`py-3 flex gap-3.5 cursor-pointer rounded-xl px-2 transition-all duration-200 text-left items-center ${
                  notif.read ? 'hover:bg-white/5' : 'bg-brand-500/5 hover:bg-brand-500/10'
                }`}
              >
                <div
                  onClick={() => handleMarkRead(notif)}
                  className={`p-2 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center ${config.color}`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
                <div onClick={() => handleMarkRead(notif)} className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <p className={`text-xs font-bold truncate ${notif.read ? 'text-white' : 'text-brand-400'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[9px] text-slate-500 shrink-0 font-medium">
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
                
                <div className="flex flex-col items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOne(notif._id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 rounded-md transition-colors"
                    title="Delete Notification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
            <div className="p-3 rounded-full bg-white/5 text-slate-500">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-xs text-slate-400 font-medium">You are all caught up!</p>
            <p className="text-[10px] text-slate-500">No new alerts to review.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-white/5">
        <Link
          href="/notifications"
          onClick={onClose}
          className="block w-full text-center py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
        >
          View All Notifications
        </Link>
      </div>
    </div>
  );
}
