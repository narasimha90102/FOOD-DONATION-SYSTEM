import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { ArrowLeft, Compass, MapPin } from 'lucide-react';

export default function MapScreen() {
  const { activeDonationId, navigate } = useAppStore();
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeDonationId) return;

    const fetchDonation = async () => {
      try {
        const res = await MobileApiService.get(`/donations/${activeDonationId}`);
        setDonation(res.donation);
      } catch (e) {
        console.warn('[MobileMapDetails] Error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDonation();
  }, [activeDonationId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Calibrating GPS logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      
      {/* App bar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigate('NGO_DASHBOARD')} style={styles.backBtn}>
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Surplus Transit Tracking</Text>
      </View>

      <View style={styles.mapContainer}>
        <View style={styles.compassIcon}>
          <Compass size={40} color="#10b981" />
        </View>
        <Text style={styles.mapText}>Visualizing active GPS vectors</Text>
        <Text style={styles.coordinatesText}>
          Coordinates: [{donation?.location?.coordinates?.join(', ') || 'N/A'}]
        </Text>
      </View>

      <View style={styles.detailsBox}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPin size={16} color="#10b981" />
          <Text style={styles.detailsTitle}>Surplus Address:</Text>
        </View>
        <Text style={styles.detailsVal}>{donation?.pickupAddress || 'Verified Pickup Station'}</Text>
        
        <View style={styles.etaBox}>
          <Text style={styles.etaText}>Transit status: {donation?.status}</Text>
        </View>
      </View>

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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  appBarTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  compassIcon: {
    transform: [{ rotate: '45deg' }],
  },
  mapText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  coordinatesText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'System',
  },
  detailsBox: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    margin: 20,
    padding: 16,
    borderRadius: 10,
    gap: 6,
  },
  detailsTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailsVal: {
    color: '#ffffff',
    fontSize: 13,
  },
  etaBox: {
    marginTop: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  etaText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
