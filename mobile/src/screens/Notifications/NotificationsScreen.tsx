import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { notificationApi } from '../../api/notifications';

export const NotificationsScreen = () => {
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

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Notifications" subtitle="Live updates, status changes & announcements" showLogout={false} />

      <View style={styles.content}>
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchNotifications} tintColor="#10B981" />}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No notifications yet.</Text>
              <Text style={styles.emptySubtext}>You will be alerted here for donation updates.</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleMarkRead(item._id)}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.title}>{item.title || 'System Notification'}</Text>
                  {!item.read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.message}>{item.message || item.text}</Text>
                <Text style={styles.time}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : ''}</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  readCard: {
    borderLeftColor: '#334155',
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  message: {
    color: '#CBD5E1',
    fontSize: 14,
    marginTop: 4,
  },
  time: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 6,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySubtext: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
});
