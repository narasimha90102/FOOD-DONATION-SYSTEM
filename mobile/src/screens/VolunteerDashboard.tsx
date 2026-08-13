import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking
} from 'react-native';
import * as Location from 'expo-location';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { Truck, Navigation, LogOut, CheckSquare, RefreshCw, MapPin } from 'lucide-react';

interface DonationItem {
  _id: string;
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  status: string;
  pickupAddress: string;
  location?: { coordinates: [number, number] };
  destinationLocation?: { coordinates: [number, number] };
  destinationAddress?: string;
  donor?: { name: string };
  ngo?: { name: string; address: string; location?: { coordinates: [number, number] } };
  volunteer?: any;
}

export default function VolunteerDashboard() {
  const { user, logout, navigate } = useAppStore();

  const [available, setAvailable] = useState<DonationItem[]>([]);
  const [active, setActive] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [navLoading, setNavLoading] = useState(false);

  const fetchData = async () => {
    try {
      const res = await MobileApiService.get('/donations');
      const all: DonationItem[] = res.donations || [];

      setAvailable(all.filter(d => d.status === 'NGO_ACCEPTED' && !d.volunteer));
      setActive(all.filter(d =>
        d.volunteer &&
        typeof d.volunteer === 'object' &&
        d.volunteer._id === user?._id &&
        !['DELIVERED', 'DISTRIBUTED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(d.status)
      ));
    } catch (e) {
      console.warn('[VolunteerMobile] Load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const claimPickup = async (donationId: string) => {
    try {
      setActionLoading(donationId);
      await MobileApiService.put(`/donations/${donationId}/assign-volunteer`, {});
      await fetchData();
    } catch {
      alert('Error claiming pickup.');
    } finally {
      setActionLoading(null);
    }
  };

  const updateStatus = async (donationId: string, nextStatus: string) => {
    try {
      setActionLoading(donationId);
      await MobileApiService.put(`/donations/${donationId}/status`, { status: nextStatus });
      await fetchData();
    } catch {
      alert('Error updating status.');
    } finally {
      setActionLoading(null);
    }
  };

  // Leg 1: Fresh GPS → Pickup
  const openLeg1Nav = async (item: DonationItem) => {
    const pickupCoords = item.location?.coordinates;
    const dest = pickupCoords
      ? `${pickupCoords[1]},${pickupCoords[0]}`
      : encodeURIComponent(item.pickupAddress);

    setNavLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const origin = `${loc.coords.latitude},${loc.coords.longitude}`;
        const nativeUrl = `comgooglemaps://?saddr=${origin}&daddr=${dest}&directionsmode=driving`;
        const webUrl = `https://www.google.com/maps/dir/${origin}/${dest}`;
        const canOpen = await Linking.canOpenURL(nativeUrl);
        await Linking.openURL(canOpen ? nativeUrl : webUrl);
      } else {
        await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`);
      }
    } catch {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`);
    } finally {
      setNavLoading(false);
    }
  };

  // Leg 2: Pickup → NGO Destination
  const openLeg2Nav = (item: DonationItem) => {
    const pickupCoords = item.location?.coordinates;
    const ngoDestCoords = item.destinationLocation?.coordinates || item.ngo?.location?.coordinates;
    const ngoAddr = item.destinationAddress || item.ngo?.address || '';

    const origin = pickupCoords
      ? `${pickupCoords[1]},${pickupCoords[0]}`
      : encodeURIComponent(item.pickupAddress);
    const dest = ngoDestCoords
      ? `${ngoDestCoords[1]},${ngoDestCoords[0]}`
      : encodeURIComponent(ngoAddr);

    Linking.openURL(`https://www.google.com/maps/dir/${origin}/${dest}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading volunteer tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>

      <View style={styles.appBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Truck size={20} color="#10b981" />
          <Text style={styles.appBarTitle}>Volunteer Hub</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>

        {/* Active Tasks */}
        <Text style={styles.section}>Active Tasks</Text>
        {active.length === 0 ? (
          <View style={styles.empty}>
            <Truck size={28} color="#475569" />
            <Text style={styles.emptyText}>No active deliveries.</Text>
          </View>
        ) : active.map((item) => (
          <View key={item._id} style={[styles.card, styles.cardActive]}>
            <Text style={styles.cardTitle}>{item.foodName}</Text>
            <Text style={styles.cardSub}>Qty: {item.quantity} {item.unit}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>

            {/* Pickup address */}
            <View style={styles.addrRow}>
              <MapPin size={11} color="#10b981" />
              <Text style={styles.addrText}>{item.pickupAddress}</Text>
            </View>

            {/* Destination */}
            {(item.destinationAddress || item.ngo?.address) && (
              <View style={styles.addrRow}>
                <MapPin size={11} color="#3b82f6" />
                <Text style={[styles.addrText, { color: '#93c5fd' }]}>
                  {item.destinationAddress || item.ngo?.address}
                </Text>
              </View>
            )}

            {/* Special Instructions */}
            {item.specialInstructions ? (
              <View style={styles.addrRow}>
                <MapPin size={11} color="#f59e0b" />
                <Text style={[styles.addrText, { color: '#fcd34d' }]}>
                  🏢 {item.specialInstructions}
                </Text>
              </View>
            ) : null}

            {/* Google Maps Nav buttons */}
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => openLeg1Nav(item)}
                disabled={navLoading}
                style={[styles.navBtn, styles.navAmber]}
              >
                {navLoading
                  ? <ActivityIndicator size="small" color="#030712" />
                  : <Navigation size={13} color="#030712" />
                }
                <Text style={styles.navAmberText}>📍 Me → Pickup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openLeg2Nav(item)}
                style={[styles.navBtn, styles.navBlue]}
              >
                <Navigation size={13} color="#ffffff" />
                <Text style={styles.navBlueText}>📦 → NGO</Text>
              </TouchableOpacity>
            </View>

            {/* Status actions */}
            <View style={styles.actionRow}>
              {item.status === 'NGO_ACCEPTED' && (
                <TouchableOpacity
                  onPress={() => updateStatus(item._id, 'GOING_TO_PICKUP')}
                  disabled={actionLoading === item._id}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>Start Pickup</Text>
                </TouchableOpacity>
              )}
              {item.status === 'GOING_TO_PICKUP' && (
                <TouchableOpacity
                  onPress={() => updateStatus(item._id, 'PICKED_UP')}
                  disabled={actionLoading === item._id}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>Mark Picked Up</Text>
                </TouchableOpacity>
              )}
              {item.status === 'PICKED_UP' && (
                <TouchableOpacity
                  onPress={() => updateStatus(item._id, 'IN_TRANSIT')}
                  disabled={actionLoading === item._id}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>Start Transit</Text>
                </TouchableOpacity>
              )}
              {item.status === 'IN_TRANSIT' && (
                <TouchableOpacity
                  onPress={() => updateStatus(item._id, 'DELIVERED')}
                  disabled={actionLoading === item._id}
                  style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
                >
                  <Text style={styles.actionBtnText}>Mark Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Available Pickups */}
        <Text style={[styles.section, { marginTop: 8 }]}>Available Pickups</Text>
        {available.length === 0 ? (
          <View style={styles.empty}>
            <CheckSquare size={28} color="#475569" />
            <Text style={styles.emptyText}>No available pickups right now.</Text>
          </View>
        ) : available.map((item) => (
          <View key={item._id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.foodName}</Text>
            <Text style={styles.cardSub}>{item.quantity} {item.unit} · {item.foodCategory}</Text>
            <View style={styles.addrRow}>
              <MapPin size={11} color="#64748b" />
              <Text style={styles.addrText}>{item.pickupAddress}</Text>
            </View>
            {item.specialInstructions ? (
              <View style={styles.addrRow}>
                <MapPin size={11} color="#f59e0b" />
                <Text style={[styles.addrText, { color: '#fcd34d' }]}>
                  🏢 {item.specialInstructions}
                </Text>
              </View>
            ) : null}
            <TouchableOpacity
              onPress={() => claimPickup(item._id)}
              disabled={actionLoading === item._id}
              style={styles.claimBtn}
            >
              {actionLoading === item._id
                ? <ActivityIndicator size="small" color="#030712" />
                : <Text style={styles.claimBtnText}>Accept Pickup Task</Text>
              }
            </TouchableOpacity>
          </View>
        ))}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  loadingContainer: { flex: 1, backgroundColor: '#030712', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 13 },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  appBarTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 8, borderRadius: 8 },
  body: { padding: 16, gap: 10 },
  section: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', borderLeftWidth: 3, borderColor: '#10b981', paddingLeft: 8 },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { color: '#475569', fontSize: 12 },
  card: {
    backgroundColor: 'rgba(17,24,39,0.8)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, gap: 8,
  },
  cardActive: { borderColor: 'rgba(16,185,129,0.2)' },
  cardTitle: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  cardSub: { color: '#94a3b8', fontSize: 11 },
  statusBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start',
  },
  statusText: { color: '#10b981', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  addrText: { color: '#94a3b8', fontSize: 11, flex: 1 },
  navRow: { flexDirection: 'row', gap: 8 },
  navBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 38, borderRadius: 8, gap: 5, borderWidth: 1,
  },
  navAmber: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
  navAmberText: { color: '#fbbf24', fontWeight: 'bold', fontSize: 11 },
  navBlue: { backgroundColor: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.3)' },
  navBlueText: { color: '#93c5fd', fontWeight: 'bold', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, backgroundColor: '#10b981', height: 38, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { color: '#030712', fontWeight: 'bold', fontSize: 12 },
  claimBtn: {
    backgroundColor: '#10b981', height: 42, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  claimBtnText: { color: '#030712', fontWeight: 'bold', fontSize: 13 },
});
