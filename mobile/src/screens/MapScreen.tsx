import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { ArrowLeft, Navigation, MapPin, RefreshCw } from 'lucide-react';

export default function MapScreen() {
  const { activeDonationId, navigate } = useAppStore();
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [navLoading, setNavLoading] = useState(false);

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

  // Leg 1: Get fresh device GPS → Navigate to Pickup
  const openLeg1Nav = async () => {
    if (!donation) return;
    const pickupCoords = donation.location?.coordinates; // [lng, lat]
    const pickupAddr = donation.pickupAddress || '';

    const dest = pickupCoords
      ? `${pickupCoords[1]},${pickupCoords[0]}`  // lat,lng for Google Maps
      : encodeURIComponent(pickupAddr);

    setNavLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const origin = `${loc.coords.latitude},${loc.coords.longitude}`;
        // Try native Google Maps app first, fall back to web
        const nativeUrl = `comgooglemaps://?saddr=${origin}&daddr=${dest}&directionsmode=driving`;
        const webUrl = `https://www.google.com/maps/dir/${origin}/${dest}`;
        const canOpen = await Linking.canOpenURL(nativeUrl);
        await Linking.openURL(canOpen ? nativeUrl : webUrl);
      } else {
        // No permission — open web Maps without origin (Maps app will ask)
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`);
      }
    } catch {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`);
    } finally {
      setNavLoading(false);
    }
  };

  // Leg 2: Pickup → NGO Destination (both fixed coords)
  const openLeg2Nav = () => {
    if (!donation) return;
    const pickupCoords = donation.location?.coordinates; // [lng, lat]
    const destCoords = donation.destinationLocation?.coordinates || donation.ngo?.location?.coordinates;
    const pickupAddr = donation.pickupAddress || '';
    const ngoAddr = donation.destinationAddress || donation.ngo?.address || '';

    const origin = pickupCoords
      ? `${pickupCoords[1]},${pickupCoords[0]}`
      : encodeURIComponent(pickupAddr);
    const dest = destCoords
      ? `${destCoords[1]},${destCoords[0]}`
      : encodeURIComponent(ngoAddr);

    Linking.openURL(`https://www.google.com/maps/dir/${origin}/${dest}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Calibrating GPS logs...</Text>
      </View>
    );
  }

  const pickupCoords = donation?.location?.coordinates;
  const destCoords = donation?.destinationLocation?.coordinates || donation?.ngo?.location?.coordinates;
  const destAddress = donation?.destinationAddress || donation?.ngo?.address;

  return (
    <View style={styles.rootContainer}>

      {/* App bar */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => navigate('NGO_DASHBOARD')} style={styles.backBtn}>
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Surplus Transit Tracking</Text>
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>

        {/* Pickup */}
        <View style={styles.infoRow}>
          <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>📦 Pickup Location</Text>
            <Text style={styles.infoVal}>{donation?.pickupAddress || 'N/A'}</Text>
            {pickupCoords && (
              <Text style={styles.infoCoords}>[{pickupCoords[1]?.toFixed(5)}, {pickupCoords[0]?.toFixed(5)}]</Text>
            )}
          </View>
        </View>

        <View style={styles.connector} />

        {/* NGO Destination */}
        <View style={styles.infoRow}>
          <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>🏢 NGO Destination</Text>
            <Text style={styles.infoVal}>{destAddress || 'Not set'}</Text>
            {destCoords && (
              <Text style={styles.infoCoords}>[{destCoords[1]?.toFixed(5)}, {destCoords[0]?.toFixed(5)}]</Text>
            )}
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>Status: {donation?.status}</Text>
        </View>
      </View>

      {/* Google Maps Navigation Buttons */}
      <View style={styles.navSection}>
        <Text style={styles.navSectionLabel}>OPEN IN GOOGLE MAPS</Text>

        {/* Leg 1: Current Location → Pickup */}
        <TouchableOpacity
          onPress={openLeg1Nav}
          disabled={navLoading}
          style={[styles.navBtn, styles.navBtnAmber, navLoading && { opacity: 0.6 }]}
        >
          <View style={styles.navBtnIcon}>
            {navLoading
              ? <ActivityIndicator size="small" color="#030712" />
              : <Navigation size={16} color="#030712" />
            }
          </View>
          <View style={styles.navBtnText}>
            <Text style={styles.navBtnTitle}>
              {navLoading ? 'Getting your location...' : '📍 Current Location → 📦 Pickup'}
            </Text>
            <Text style={styles.navBtnSub}>
              {navLoading ? 'Please allow location permission' : 'Fetches GPS now · opens Google Maps'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Leg 2: Pickup → NGO */}
        <TouchableOpacity
          onPress={openLeg2Nav}
          style={[styles.navBtn, styles.navBtnBlue]}
        >
          <View style={[styles.navBtnIcon, { backgroundColor: 'rgba(59,130,246,0.3)' }]}>
            <Navigation size={16} color="#ffffff" />
          </View>
          <View style={styles.navBtnText}>
            <Text style={[styles.navBtnTitle, { color: '#93c5fd' }]}>📦 Pickup → 🏢 NGO Destination</Text>
            <Text style={styles.navBtnSub}>
              {destAddress ? destAddress.split(',')[0] : 'Set NGO destination first'} · driving
            </Text>
          </View>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#030712' },
  loadingContainer: { flex: 1, backgroundColor: '#030712', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 13 },
  appBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 50, paddingBottom: 16, borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)', gap: 12,
  },
  backBtn: { padding: 4 },
  appBarTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  infoCard: {
    margin: 16, backgroundColor: 'rgba(17,24,39,0.8)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 16, gap: 4,
  },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  connector: { width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 5 },
  infoLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoVal: { color: '#ffffff', fontSize: 13, marginTop: 2 },
  infoCoords: { color: '#64748b', fontSize: 10, fontFamily: 'System', marginTop: 2 },
  statusBox: {
    marginTop: 10, backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.2)', borderWidth: 1,
    padding: 8, borderRadius: 8, alignItems: 'center',
  },
  statusText: { color: '#10b981', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' },

  navSection: { paddingHorizontal: 16, gap: 10 },
  navSectionLabel: { color: '#475569', fontSize: 9, fontWeight: 'bold', letterSpacing: 1.5 },

  navBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 14, gap: 12, borderWidth: 1,
  },
  navBtnAmber: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  navBtnBlue: { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)' },
  navBtnIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnText: { flex: 1 },
  navBtnTitle: { color: '#fde68a', fontWeight: 'bold', fontSize: 12 },
  navBtnSub: { color: '#78716c', fontSize: 10, marginTop: 2 },
});
