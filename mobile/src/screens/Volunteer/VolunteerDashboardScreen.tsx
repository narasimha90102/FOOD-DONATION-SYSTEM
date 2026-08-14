import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { donationApi } from '../../api/donations';

export const VolunteerDashboardScreen = ({ navigation }: any) => {
  const [assigned, setAssigned] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Volunteer Hub" subtitle="Manage food pickup and distribution routes" />

      <View style={styles.content}>
        <Text style={styles.sectionHeader}>Assigned Pickups ({assigned.length})</Text>

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
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
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
