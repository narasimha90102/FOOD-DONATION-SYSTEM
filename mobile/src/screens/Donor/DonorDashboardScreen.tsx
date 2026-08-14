import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { donationApi } from '../../api/donations';

export const DonorDashboardScreen = ({ navigation }: any) => {
  const [donations, setDonations] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDonations = async () => {
    try {
      setRefreshing(true);
      const res = await donationApi.getMyDonations();
      if (res.success && Array.isArray(res.donations)) {
        setDonations(res.donations);
      }
    } catch (err) {
      console.error('Failed to load donor donations:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Donor Dashboard" subtitle="Manage & track your active food donations" />

      <View style={styles.content}>
        <Button
          title="+ Create New Food Donation"
          onPress={() => navigation.navigate('CreateDonation')}
          style={styles.createBtn}
        />

        <Text style={styles.sectionHeader}>My Active Donations ({donations.length})</Text>

        <FlatList
          data={donations}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDonations} tintColor="#10B981" />}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No food donations submitted yet.</Text>
              <Text style={styles.emptySubtext}>Tap the button above to post your surplus food!</Text>
            </Card>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.foodTitle}>{item.foodTitle}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.status?.toUpperCase() || 'AVAILABLE'}</Text>
                </View>
              </View>
              <Text style={styles.cardDetails}>Type: {item.foodType} • {item.quantityKg} kg ({item.servings} Servings)</Text>
              <Text style={styles.cardAddress}>📍 {item.pickupAddress}</Text>

              {item.notes ? <Text style={styles.notes}>Notes: {item.notes}</Text> : null}

              <TouchableOpacity
                style={styles.chatBtn}
                onPress={() => navigation.navigate('Chat', { donationId: item._id, title: item.foodTitle })}
              >
                <Text style={styles.chatBtnText}>💬 Live Chat & Coordinator</Text>
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
  createBtn: {
    marginBottom: 16,
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
  badge: {
    backgroundColor: '#10B98122',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDetails: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 6,
  },
  cardAddress: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 4,
  },
  notes: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  chatBtn: {
    marginTop: 12,
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
