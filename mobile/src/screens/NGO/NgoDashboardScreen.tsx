import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { donationApi } from '../../api/donations';

export const NgoDashboardScreen = ({ navigation }: any) => {
  const [available, setAvailable] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAvailable = async () => {
    try {
      setRefreshing(true);
      const res = await donationApi.getAvailable();
      if (res.success && Array.isArray(res.donations)) {
        setAvailable(res.donations);
      }
    } catch (err) {
      console.error('Failed to load available donations:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaim = async (id: string) => {
    try {
      await donationApi.claimDonation(id);
      Alert.alert('Claimed!', 'You have successfully claimed this donation for pickup.');
      fetchAvailable();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to claim donation');
    }
  };

  useEffect(() => {
    fetchAvailable();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="NGO Hub" subtitle="Claim nearby surplus food for distribution" />

      <View style={styles.content}>
        <Text style={styles.sectionHeader}>Available Food Donations ({available.length})</Text>

        <FlatList
          data={available}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAvailable} tintColor="#10B981" />}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No available donations right now.</Text>
              <Text style={styles.emptySubtext}>Check back soon for newly posted food from donors!</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.foodTitle}>{item.foodTitle}</Text>
                <Text style={styles.expiry}>⏱ Expires in {item.expiryHours || 4}h</Text>
              </View>
              <Text style={styles.details}>Quantity: {item.quantityKg} kg ({item.servings} Servings)</Text>
              <Text style={styles.address}>📍 {item.pickupAddress}</Text>

              <Button title="Claim Food Batch" onPress={() => handleClaim(item._id)} style={styles.claimBtn} />

              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('Chat', { donationId: item._id, title: item.foodTitle })}
              >
                <Text style={styles.chatBtnText}>💬 Coordinate Pickup with Donor</Text>
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
  expiry: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  details: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 6,
  },
  address: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 4,
  },
  claimBtn: {
    marginTop: 12,
  },
  chatBtn: {
    marginTop: 6,
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
