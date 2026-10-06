import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { notificationApi } from '../../api/notifications';
import { SocketService } from '../../services/socketService';
import { Heart, Sparkles, Truck, CheckCircle2, AlertTriangle, ShieldCheck, MessageSquare, Bell, Calendar, CheckCheck, Trash2 } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';

export const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const res = await notificationApi.getAll();
      if (res.success && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkRead = async (notif: any) => {
    try {
      if (!notif.read) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        await notificationApi.markRead(notif._id);
      }
      
      if (notif.relatedId) {
        if (notif.type === 'CHAT') {
          navigation.navigate('Chat', { donationId: notif.relatedId });
        }
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Optimistic instant UI removal
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      await notificationApi.delete(notificationId);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      fetchNotifications();
    }
  };

  const confirmDelete = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteNotification(notificationId),
        },
      ]
    );
  };

  const handleMarkAllRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await notificationApi.markAllRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      fetchNotifications();
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Real-time socket listeners
    const unsub1 = SocketService.on('new_notification', (newNotif: any) => {
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n._id !== newNotif._id)]);
    });
    const unsub2 = SocketService.on('notification:created', (newNotif: any) => {
      setNotifications((prev) => [newNotif, ...prev.filter((n) => n._id !== newNotif._id)]);
    });
    const unsub3 = SocketService.on('notification_deleted', (data: any) => {
      if (data?.notificationId) {
        setNotifications((prev) => prev.filter((n) => n._id !== data.notificationId));
      }
    });
    const unsub4 = SocketService.on('notification:deleted', (data: any) => {
      if (data?.notificationId) {
        setNotifications((prev) => prev.filter((n) => n._id !== data.notificationId));
      }
    });
    const unsub5 = SocketService.on('notification_read', (data: any) => {
      if (data?.notificationId) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === data.notificationId ? { ...n, read: true } : n))
        );
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, []);


  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'NEW_DONATION':
        return { Icon: Heart, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)' };
      case 'DONATION_ACCEPTED':
        return { Icon: Sparkles, color: '#818CF8', bg: 'rgba(129, 140, 248, 0.1)', border: 'rgba(129, 140, 248, 0.2)' };
      case 'PICKUP_STARTED':
        return { Icon: Truck, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.2)' };
      case 'DELIVERY_COMPLETED':
        return { Icon: CheckCircle2, color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.2)' };
      case 'EXPIRY_WARNING':
        return { Icon: AlertTriangle, color: '#F87171', bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.2)' };
      case 'VERIFICATION_UPDATE':
        return { Icon: ShieldCheck, color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.2)' };
      case 'CHAT':
        return { Icon: MessageSquare, color: '#C084FC', bg: 'rgba(192, 132, 252, 0.1)', border: 'rgba(192, 132, 252, 0.2)' };
      default:
        return { Icon: Bell, color: '#94A3B8', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)' };
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <Header title="Notification Center" showBack={true} />

      <View style={styles.headerSection}>
        <View style={{ flex: 1 }}>
          <Text style={styles.subtitle}>Stay updated with real-time food surplus postings, rescue requests, and verification logs.</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <CheckCheck size={14} color="#0F172A" />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item._id || Math.random().toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} tintColor="#10B981" />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Bell size={32} color="#64748B" />
            </View>
            <Text style={styles.emptyText}>All Caught Up!</Text>
            <Text style={styles.emptySubtext}>You do not have any notifications at the moment. As soon as a donor posts new food items or updates status events, they will show up here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const config = getNotificationConfig(item.type);
          const IconComponent = config.Icon;
          return (
            <TouchableOpacity 
              onPress={() => handleMarkRead(item)}
              style={[
                styles.card,
                item.read ? styles.cardRead : styles.cardUnread
              ]}
              activeOpacity={0.7}
            >
              {!item.read && <View style={styles.unreadDot} />}
              
              <View style={[styles.iconContainer, { backgroundColor: config.bg, borderColor: config.border }]}>
                <IconComponent size={24} color={config.color} />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !item.read && { color: config.color }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.timeRow}>
                    <Calendar size={10} color="#64748B" />
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.message}>{item.message}</Text>
                
                {item.relatedId && (
                  <Text style={styles.navHint}>NAVIGATE TO DETAIL PAGE →</Text>
                )}
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={() => confirmDelete(item._id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={16} color="#64748B" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      <BottomNavbar activeTab="notifications" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark900,
  },
  headerSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  markAllText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
    alignItems: 'center',
  },
  cardUnread: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  cardRead: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 42,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  message: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  navHint: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyIconBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 32,
    marginBottom: 16,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
