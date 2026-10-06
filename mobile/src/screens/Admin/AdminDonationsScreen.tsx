import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { apiClient } from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';

export const AdminDonationsScreen = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDonations = async () => {
    try {
      setRefreshing(true);
      const res = await apiClient.get('/admin/donations');
      setDonations(res.data.donations || []);
    } catch (err) {
      console.error('[AdminDonations] Fetch failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDonations();
    }, [])
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark900 }}>
      <Header title="Audit Registry" showBack={true} />
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDonations} tintColor="#10B981" />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Audit Registry</Text>
          <Text style={styles.subtitle}>All system surplus records and lifecycle timelines</Text>
        </View>

        <View style={styles.list}>
          {donations.map(item => (
            <View key={item._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.foodName}>{item.foodName}</Text>
                <View style={[styles.statusBadge, {
                  backgroundColor: item.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  borderColor: item.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'
                }]}>
                  <Text style={[styles.statusText, {
                    color: item.status === 'COMPLETED' ? '#10B981' : '#F59E0B'
                  }]}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.infoText}>Quantity: <Text style={styles.infoBold}>{item.quantity} {item.unit}</Text></Text>
              <Text style={styles.infoText}>Donor: <Text style={styles.infoBold}>{item.donor?.name || 'N/A'}</Text></Text>
              <Text style={styles.infoText}>NGO: <Text style={styles.infoBold}>{item.ngo?.name || 'N/A'}</Text></Text>
              <Text style={styles.infoText}>Volunteer: <Text style={styles.infoBold}>{item.volunteer?.name || 'N/A'}</Text></Text>
              
              <View style={styles.dateBox}>
                <Text style={styles.dateText}>Posted: {new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
      <BottomNavbar activeTab="home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark900,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.dark900,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.slate400,
    fontSize: 14,
    marginTop: 6,
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  infoBold: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 12,
  },
  dateBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
  }
});
