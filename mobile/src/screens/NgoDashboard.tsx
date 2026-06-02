import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { Compass, Navigation, LogOut, Map } from 'lucide-react';

interface NearbyDonation {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  distance: number;
  donor: {
    name: string;
  };
}

export default function NgoDashboard() {
  const { logout, navigate } = useAppStore();
  
  const [nearby, setNearby] = useState<NearbyDonation[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNgoData = async () => {
    try {
      const nearbyRes = await MobileApiService.get('/donations/nearby?radius=15');
      const pipelineRes = await MobileApiService.get('/donations');

      setNearby(nearbyRes.donations || []);
      setPipeline((pipelineRes.donations || []).filter((d: any) => d.status !== 'COMPLETED'));
    } catch (e) {
      console.warn('[NgoMobileTelemetry] Load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoData();
  }, []);

  const handleClaim = async (donationId: string) => {
    try {
      setLoading(true);
      await MobileApiService.put(`/donations/${donationId}/accept`, {});
      await fetchNgoData();
    } catch (e) {
      alert('Surplus claim failed.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Scouting Nearby Surpluses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      
      <View style={styles.appBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Compass size={20} color="#10b981" />
          <Text style={styles.appBarTitle}>NGO Proximity Radar</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.appBarBtn}>
          <LogOut size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        
        {/* Nearby scans title */}
        <Text style={styles.sectionTitle}>Nearby Unclaimed Surpluses</Text>

        {nearby.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Compass size={32} color="#64748b" />
            <Text style={styles.emptyText}>No food surpluses detected within 15KM. Scan coordinates again.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {nearby.map((item) => (
              <View key={item._id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listItemName}>{item.foodName}</Text>
                  <Text style={styles.listItemDonor}>Donor: {item.donor.name}</Text>
                  <Text style={styles.listItemDistance}>{item.distance} km away</Text>
                </View>

                <TouchableOpacity onPress={() => handleClaim(item._id)} style={styles.btnClaim}>
                  <Text style={styles.btnClaimText}>Claim</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Claimed pickup items title */}
        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Active Pipeline Pickups</Text>

        {pipeline.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Navigation size={32} color="#64748b" />
            <Text style={styles.emptyText}>No active pickup logistics scheduled.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {pipeline.map((item) => (
              <View key={item._id} style={[styles.listItem, styles.listItemPipeline]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listItemName}>{item.foodName}</Text>
                  <Text style={styles.listItemDonor}>Status: {item.status}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => navigate('MAP', { donationId: item._id })}
                  style={styles.btnMap}
                >
                  <Map size={16} color="#030712" />
                  <Text style={styles.btnMapText}>GPS</Text>
                </TouchableOpacity>
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
  appBarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appBarBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  scrollBody: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    borderLeftWidth: 3,
    borderColor: '#10b981',
    paddingLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 11,
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
  listItemPipeline: {
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  listItemName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listItemDonor: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  listItemDistance: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  btnClaim: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnClaimText: {
    color: '#030712',
    fontWeight: 'bold',
    fontSize: 12,
  },
  btnMap: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  btnMapText: {
    color: '#030712',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
