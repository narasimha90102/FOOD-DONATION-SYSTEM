import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { donationApi } from '../../api/donations';
import Geolocation from '@react-native-community/geolocation';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../../config/env';
import { LiveMap } from '../../components/LiveMap';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const VolunteerDashboardScreen = ({ navigation }: any) => {
  const [assigned, setAssigned] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const fetchAssigned = async () => {
    try {
      setRefreshing(true);
      const res = await donationApi.getAssigned();
      if (res.success && Array.isArray(res.donations)) {
        setAssigned(res.donations);
      }
    } catch (err) {
      console.error('Failed to load assigned pickups:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await donationApi.updateStatus(id, newStatus);
      Alert.alert('Status Updated', `Donation status updated to ${newStatus}`);
      fetchAssigned();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update status');
    }
  };

  useEffect(() => {
    fetchAssigned();

    const setupSocket = async () => {
      const userStr = await AsyncStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
        socketRef.current.emit('authenticate', user._id);
      }
    };
    setupSocket();

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const toggleTracking = () => {
    if (isTracking) {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    } else {
      setIsTracking(true);
      watchIdRef.current = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          
          if (socketRef.current) {
            // Emit location for the first assigned pickup to track the route
            if (assigned.length > 0) {
               socketRef.current.emit('volunteer_location_update', {
                 donationId: assigned[0]._id,
                 coordinates: { lat: latitude, lng: longitude }
               });
            }
          }
        },
        (error) => {
          Alert.alert('Location Error', error.message);
          setIsTracking(false);
        },
        { enableHighAccuracy: true, distanceFilter: 10, interval: 5000, fastestInterval: 2000 }
      );
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Volunteer Hub" subtitle="Manage food pickup and distribution routes" />

      {currentLocation && (
        <View style={styles.mapContainer}>
          <LiveMap 
            initialLocation={currentLocation} 
            markers={assigned.map(d => ({
              id: d._id,
              coordinate: { latitude: d.location?.coordinates[1] || currentLocation.latitude, longitude: d.location?.coordinates[0] || currentLocation.longitude },
              title: d.foodTitle,
              description: `Status: ${d.status}`,
              type: 'donor'
            }))}
          />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.trackingHeader}>
          <Text style={styles.sectionHeader}>Assigned Pickups ({assigned.length})</Text>
          <Button 
            title={isTracking ? "Stop Tracking" : "Start Tracking"} 
            onPress={toggleTracking}
            variant={isTracking ? "secondary" : "primary"}
            style={styles.trackingBtn}
          />
        </View>

        <FlatList
          data={assigned}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAssigned} tintColor="#10B981" />}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No pending pickups assigned.</Text>
              <Text style={styles.emptySubtext}>You will be notified when a new pickup task is assigned to you!</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.foodTitle}>{item.foodTitle}</Text>
                <Text style={styles.status}>{item.status?.toUpperCase()}</Text>
              </View>
              <Text style={styles.details}>Quantity: {item.quantityKg} kg • Pickup: {item.pickupAddress}</Text>

              <View style={styles.btnRow}>
                <Button
                  title="Mark Picked Up"
                  onPress={() => handleUpdateStatus(item._id, 'picked_up')}
                  style={styles.actionBtn}
                />
                <Button
                  title="Mark Delivered"
                  onPress={() => handleUpdateStatus(item._id, 'completed')}
                  variant="secondary"
                  style={styles.actionBtn}
                />
              </View>

              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('Chat', { donationId: item._id, title: item.foodTitle })}
              >
                <Text style={styles.chatBtnText}>💬 Route Chat & Dispatch</Text>
              </TouchableOpacity>
            </Card>
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
  mapContainer: {
    height: 200,
    width: '100%',
    backgroundColor: '#1E293B',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  trackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 0,
  },
  sectionHeader: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  status: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  details: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    marginVertical: 0,
    paddingVertical: 10,
  },
  chatBtn: {
    marginTop: 10,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chatBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
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
