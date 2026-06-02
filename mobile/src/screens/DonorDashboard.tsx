import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { Heart, Award, ShieldCheck, LogOut, Plus } from 'lucide-react';

interface Donation {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  status: string;
  createdAt: string;
}

export default function DonorDashboard() {
  const { user, logout, navigate } = useAppStore();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await MobileApiService.get('/donations');
      setDonations(res.donations || []);
    } catch (e) {
      console.warn('[DonorMobileHistory] Error loading:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const triggerPostSurplus = async () => {
    // Quick listing injector for testing
    try {
      setLoading(true);
      const mockPost = {
        foodName: 'Leftover Rice Bowls',
        foodCategory: 'Veg Meal',
        quantity: 15,
        unit: 'Servings',
        preparationTime: new Date(),
        estimatedExpiryTime: new Date(Date.now() + 10 * 3600 * 1000), // +10 Hours
        storageCondition: 'ambient',
        pickupAddress: '5th sector, Green Garden Road',
        coordinates: [77.5946, 12.9716],
      };
      await MobileApiService.post('/donations', mockPost);
      await fetchHistory();
    } catch (e) {
      alert('Upload surplus failed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Fetching Donor Analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      
      {/* Top Header bar */}
      <View style={styles.appBar}>
        <View>
          <Text style={styles.appBarWelcome}>Welcome back,</Text>
          <Text style={styles.appBarUser}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.appBarBtn}>
          <LogOut size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        
        {/* Streak & Score row */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Heart size={20} color="#10b981" />
            <Text style={styles.statVal}>{donations.length * 10} pts</Text>
            <Text style={styles.statLabel}>Impact Points</Text>
          </View>

          <View style={styles.statCard}>
            <Award size={20} color="#06b6d4" />
            <Text style={styles.statVal}>{donations.length * 25} kg</Text>
            <Text style={styles.statLabel}>CO₂ Reduction</Text>
          </View>
        </View>

        {/* Action buttons */}
        <TouchableOpacity onPress={triggerPostSurplus} style={styles.btnAction}>
          <Plus size={18} color="#030712" />
          <Text style={styles.btnActionText}>Quick Post Surplus</Text>
        </TouchableOpacity>

        {/* History title */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Surplus History</Text>
          <Text style={styles.sectionCount}>{donations.length} items</Text>
        </View>

        {donations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ShieldCheck size={36} color="#64748b" />
            <Text style={styles.emptyText}>No food surpluses listed yet. Click button above to post.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {donations.map((item) => (
              <View key={item._id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listItemName}>{item.foodName}</Text>
                  <Text style={styles.listItemDetails}>
                    Quantity: {item.quantity} {item.unit} | {item.foodCategory}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>

                {item.status === 'ACCEPTED' ? (
                  <TouchableOpacity
                    onPress={() => navigate('CHAT', { chatId: item._id })}
                    style={styles.chatIconBtn}
                  >
                    <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 11 }}>Chat</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#030712',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#030712',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  appBarWelcome: {
    color: '#94a3b8',
    fontSize: 11,
  },
  appBarUser: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appBarBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  scrollBody: {
    padding: 20,
    gap: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statVal: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  btnAction: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 8,
    gap: 6,
  },
  btnActionText: {
    color: '#030712',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionCount: {
    color: '#64748b',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  listItemName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listItemDetails: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  chatIconBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
});
