import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Modal
} from 'react-native';
import * as Location from 'expo-location';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { Compass, Navigation, LogOut, Map, MapPin, X } from 'lucide-react';

interface NearbyDonation {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  distance: number;
  donor: { name: string };
  specialInstructions?: string;
}

export default function NgoDashboard() {
  const { logout, navigate } = useAppStore();

  const [nearby, setNearby] = useState<NearbyDonation[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Destination location picker state
  const [claimTarget, setClaimTarget] = useState<string | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destAddress, setDestAddress] = useState<string>('');
  const [locating, setLocating] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const fetchNgoData = async () => {
    try {
      const nearbyRes = await MobileApiService.get('/donations/nearby?radius=15');
      const pipelineRes = await MobileApiService.get('/donations');
      setNearby(nearbyRes.donations || []);
      setPipeline((pipelineRes.donations || []).filter((d: any) => !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(d.status)));
    } catch (e) {
      console.warn('[NgoMobileTelemetry] Load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNgoData(); }, []);

  // Use device GPS as destination (same logic as web LocationPicker)
  const pickDestinationFromGPS = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to set your NGO destination.');
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      // Reverse geocode to get address
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const place = geocode[0];
      const address = [place?.name, place?.street, place?.city, place?.region, place?.country]
        .filter(Boolean).join(', ');

      setDestCoords({ lat, lng });
      setDestAddress(address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch (e) {
      Alert.alert('GPS Error', 'Could not get your location. Please try again.');
    } finally {
      setLocating(false);
    }
  };

  const openClaimModal = (donationId: string) => {
    setClaimTarget(donationId);
    setDestCoords(null);
    setDestAddress('');
  };

  const submitClaim = async () => {
    if (!claimTarget || !destCoords) {
      Alert.alert('Location Required', 'Please set your NGO destination location first.');
      return;
    }
    try {
      setClaiming(true);
      await MobileApiService.put(`/donations/${claimTarget}/accept`, {
        destinationAddress: destAddress,
        destinationCoordinates: [destCoords.lng, destCoords.lat], // [lng, lat] for GeoJSON
      });
      setClaimTarget(null);
      await fetchNgoData();
    } catch (e) {
      Alert.alert('Error', 'Surplus claim failed. Please try again.');
    } finally {
      setClaiming(false);
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

        <Text style={styles.sectionTitle}>Nearby Unclaimed Surpluses</Text>

        {nearby.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Compass size={32} color="#64748b" />
            <Text style={styles.emptyText}>No food surpluses detected within 15KM.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {nearby.map((item) => (
              <View key={item._id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listItemName}>{item.foodName}</Text>
                  <Text style={styles.listItemDonor}>Donor: {item.donor.name}</Text>
                  <Text style={styles.listItemDistance}>{item.distance} km away</Text>
                  {item.specialInstructions ? (
                    <Text style={[styles.listItemDonor, { color: '#f59e0b', marginTop: 2 }]}>
                      🏢 {item.specialInstructions}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => openClaimModal(item._id)} style={styles.btnClaim}>
                  <Text style={styles.btnClaimText}>Claim</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Active Pipeline Pickups</Text>

        {pipeline.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Navigation size={32} color="#64748b" />
            <Text style={styles.emptyText}>No active pickup logistics scheduled.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {pipeline.map((item) => {
              const pickupCoords = item.location?.coordinates; // [lng, lat]
              const destC = item.destinationLocation?.coordinates; // [lng, lat]

              const openNav = (from: string, to: string) => {
                Linking.openURL(`https://www.google.com/maps/dir/${from}/${to}`);
              };

              return (
                <View key={item._id} style={[styles.listItem, styles.listItemPipeline]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItemName}>{item.foodName}</Text>
                    <Text style={styles.listItemDonor}>Status: {item.status}</Text>
                    {item.specialInstructions ? (
                      <Text style={[styles.listItemDonor, { color: '#f59e0b', marginTop: 2 }]}>
                        🏢 {item.specialInstructions}
                      </Text>
                    ) : null}
                    {item.destinationAddress ? (
                      <Text style={[styles.listItemDonor, { color: '#3b82f6', marginTop: 2 }]}>
                        📍 {item.destinationAddress.split(',')[0]}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => navigate('MAP', { donationId: item._id })}
                      style={styles.btnMap}
                    >
                      <Map size={14} color="#030712" />
                      <Text style={styles.btnMapText}>Track</Text>
                    </TouchableOpacity>

                    {destC && pickupCoords && (
                      <TouchableOpacity
                        onPress={() => openNav(
                          `${pickupCoords[1]},${pickupCoords[0]}`,
                          `${destC[1]},${destC[0]}`
                        )}
                        style={[styles.btnMap, { backgroundColor: '#3b82f6' }]}
                      >
                        <Navigation size={14} color="#ffffff" />
                        <Text style={[styles.btnMapText, { color: '#ffffff' }]}>Nav</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* NGO Destination Location Modal */}
      <Modal visible={!!claimTarget} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 Set NGO Destination</Text>
              <TouchableOpacity onPress={() => setClaimTarget(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Select your NGO's exact receiving location. This is used for live tracking and volunteer navigation.
            </Text>

            {/* GPS Button */}
            <TouchableOpacity
              onPress={pickDestinationFromGPS}
              disabled={locating}
              style={[styles.gpsBtn, locating && { opacity: 0.6 }]}
            >
              {locating
                ? <ActivityIndicator size="small" color="#030712" />
                : <MapPin size={16} color="#030712" />
              }
              <Text style={styles.gpsBtnText}>
                {locating ? 'Getting GPS...' : 'Use My Current Location as Destination'}
              </Text>
            </TouchableOpacity>

            {/* Selected location display */}
            {destCoords && (
              <View style={styles.destBox}>
                <Text style={styles.destLabel}>✅ Destination Confirmed:</Text>
                <Text style={styles.destAddress}>{destAddress}</Text>
                <Text style={styles.destCoords}>
                  [{destCoords.lng.toFixed(5)}, {destCoords.lat.toFixed(5)}]
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setClaimTarget(null)}
                style={styles.btnCancel}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitClaim}
                disabled={!destCoords || claiming}
                style={[styles.btnConfirm, (!destCoords || claiming) && { opacity: 0.4 }]}
              >
                {claiming
                  ? <ActivityIndicator size="small" color="#030712" />
                  : <Text style={styles.btnConfirmText}>Confirm & Claim</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#030712' },
  loadingContainer: { flex: 1, backgroundColor: '#030712', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 13 },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  appBarTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  appBarBtn: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 8, borderRadius: 8 },
  scrollBody: { padding: 20, gap: 16 },
  sectionTitle: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', borderLeftWidth: 3, borderColor: '#10b981', paddingLeft: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { color: '#64748b', fontSize: 11, textAlign: 'center' },
  listContainer: { gap: 12 },
  listItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.7)', borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderRadius: 10, padding: 16, gap: 12,
  },
  listItemPipeline: { borderColor: 'rgba(16,185,129,0.15)' },
  listItemName: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  listItemDonor: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  listItemDistance: { color: '#10b981', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  btnClaim: { backgroundColor: '#10b981', paddingHorizontal: 16, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnClaimText: { color: '#030712', fontWeight: 'bold', fontSize: 12 },
  btnMap: {
    backgroundColor: '#06b6d4', paddingHorizontal: 10, height: 32, borderRadius: 6,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  btnMapText: { color: '#030712', fontWeight: 'bold', fontSize: 11 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 16, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  modalDesc: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  gpsBtn: {
    backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', height: 48, borderRadius: 10, gap: 8,
  },
  gpsBtnText: { color: '#030712', fontWeight: 'bold', fontSize: 13 },
  destBox: {
    backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1, borderRadius: 10, padding: 12, gap: 4,
  },
  destLabel: { color: '#10b981', fontSize: 11, fontWeight: 'bold' },
  destAddress: { color: '#ffffff', fontSize: 12, marginTop: 2 },
  destCoords: { color: '#64748b', fontSize: 10, fontFamily: 'System', marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 12 },
  btnCancel: {
    flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancelText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 },
  btnConfirm: {
    flex: 2, height: 44, borderRadius: 8, backgroundColor: '#10b981',
    alignItems: 'center', justifyContent: 'center',
  },
  btnConfirmText: { color: '#030712', fontWeight: 'bold', fontSize: 13 },
});
