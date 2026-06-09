"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '../../store/useAppStore';
import { ApiService } from '../../services/api';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Trash2,
  Heart,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user, isAuthenticated, notifications, markNotificationRead, markAllNotificationsRead, setNotifications } = useAppStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hydration safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth Guard
  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  // Re-fetch fresh notifications list from database
  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await ApiService.get('/notifications');
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error('Failed to reload notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated) {
      fetchNotifications();
    }
  }, [mounted, isAuthenticated]);

  if (!mounted || !user) {
    return (
      <div className="flex-grow flex items-center justify-center bg-dark-900 py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-semibold">Loading Notification Center...</p>
        </div>
      </div>
    );
  }

  const handleMarkRead = async (notificationId: string, relatedId?: string, type?: string) => {
    try {
      markNotificationRead(notificationId);
      await ApiService.put(`/notifications/${notificationId}/read`, {});

      // Routing coordination
      if (relatedId) {
        if (type === 'CHAT') {
          router.push(`/donor/chat`);
        } else if (['NEW_DONATION', 'DONATION_ACCEPTED', 'PICKUP_STARTED', 'DELIVERY_COMPLETED'].includes(type || '')) {
          router.push(user.role === 'DONOR' ? '/donor' : user.role === 'NGO' ? '/ngo' : '/admin');
        }
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      markAllNotificationsRead();
      await ApiService.put('/notifications/mark-all-read', {});
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

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

  const formatPreciseDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'NEW_DONATION':
        return { icon: Heart, color: 'text-brand-500 bg-brand-500/10 border-brand-500/20' };
      case 'DONATION_ACCEPTED':
        return { icon: Sparkles, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
      case 'PICKUP_STARTED':
        return { icon: Truck, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' };
      case 'DELIVERY_COMPLETED':
        return { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'EXPIRY_WARNING':
        return { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10 border-red-500/20' };
      case 'VERIFICATION_UPDATE':
        return { icon: ShieldCheck, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'CHAT':
        return { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      default:
        return { icon: Bell, color: 'text-slate-400 bg-white/5 border-white/10' };
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-grow bg-dark-900/50 py-12 px-4 sm:px-6 lg:px-8 relative min-h-screen">
      <div className="max-w-4xl mx-auto">
        
        {/* Back navigation */}
        <Link
          href={user.role === 'DONOR' ? '/donor' : user.role === 'NGO' ? '/ngo' : '/admin'}
          className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 transition-all mb-6 font-bold text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white text-outfit tracking-tight">
              Notification Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Stay updated with real-time food surplus postings, rescue requests, and verification logs.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-dark-900 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-brand-500/25 shrink-0 self-start sm:self-center"
            >
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </button>
          )}
        </div>

        {/* Notifications list */}
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-xs font-medium">Fetching details...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notif) => {
              const config = getNotificationConfig(notif.type);
              const IconComponent = config.icon;

              return (
                <div
                  key={notif._id}
                  onClick={() => handleMarkRead(notif._id, notif.relatedId, notif.type)}
                  className={`glass-panel p-5 border-white/5 flex gap-4 transition-all duration-300 relative cursor-pointer group ${
                    notif.read
                      ? 'bg-dark-800/40 hover:bg-dark-800/80 hover:border-white/10'
                      : 'bg-brand-500/5 hover:bg-brand-500/10 border-brand-500/20 hover:border-brand-500/40 shadow-lg shadow-brand-500/5'
                  }`}
                >
                  {/* Indicator Dot */}
                  {!notif.read && (
                    <span className="absolute top-5 right-5 h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  )}

                  {/* Icon Container */}
                  <div className={`p-3 rounded-xl border h-12 w-12 flex items-center justify-center shrink-0 ${config.color}`}>
                    <IconComponent className="h-6 w-6" />
                  </div>

                  {/* Details */}
                  <div className="flex-grow min-w-0 pr-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <h3 className={`text-sm font-bold truncate ${notif.read ? 'text-white' : 'text-brand-400'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-medium md:order-last flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {formatPreciseDate(notif.createdAt)} ({timeAgo(notif.createdAt)})
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed font-medium">
                      {notif.message}
                    </p>

                    {notif.relatedId && (
                      <span className="inline-block mt-3 text-[10px] font-bold text-brand-500 uppercase tracking-wider group-hover:underline">
                        Navigate to detail page →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="glass-panel border-white/5 p-12 text-center flex flex-col items-center justify-center">
            <div className="p-4 rounded-full bg-white/5 text-slate-500 mb-4 animate-float">
              <Bell className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 text-outfit">All Caught Up!</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              You do not have any notifications at the moment. As soon as a donor posts new food items or updates status events, they will show up here.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
