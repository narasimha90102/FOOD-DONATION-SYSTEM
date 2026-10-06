import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Modal, PermissionsAndroid, Platform, Linking } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { SocketService } from '../../services/socketService';
import { LocationPicker } from '../../components/LocationPicker';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { formatISTDateTime } from '../../utils/formatDate';
import { Compass, MapPin, RefreshCw, CheckSquare, Navigation, AlertTriangle, Landmark, XCircle, Star, History, Clock, CheckCircle2, Truck, User } from 'lucide-react-native';
import Geolocation from '@react-native-community/geolocation';

export const NgoDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [nearby, setNearby] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'radar' | 'pipeline' | 'history'>('radar');
  const [radius, setRadius] = useState<number>(15);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locationKnown, setLocationKnown] = useState(true);

  // Tracking modal state
  const [trackTarget, setTrackTarget] = useState<any | null>(null);

  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [distributingId, setDistributingId] = useState<string | null>(null);

  // Claim modal state (NGO Receiver Destination Location — map-based only)
  const [claimModalTarget, setClaimModalTarget] = useState<string | null>(null);
  const [claimLocationData, setClaimLocationData] = useState<{ address: string; coordinates: [number, number] } | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      fetchDashboardData();
    };

    const unsub1 = SocketService.on('donation_updated', handleUpdate);
    const unsub2 = SocketService.on('donation:updated', handleUpdate);
    const unsub3 = SocketService.on('donation_update', handleUpdate);
    const unsub4 = SocketService.on('new_donation', handleUpdate);
    const unsub5 = SocketService.on('donation:created', handleUpdate);
    const unsub6 = SocketService.on('donation:statusChanged', handleUpdate);
    const unsub7 = SocketService.on('donation:cancelled', handleUpdate);
    const unsub8 = SocketService.on('donation_cancelled', handleUpdate);
    const unsub9 = SocketService.on('new_notification', handleUpdate);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
      unsub9();
    };
  }, []);

  const fetchDashboardData = async (coords?: { lng: number; lat: number }) => {
    if (user?.role === 'NGO' && user?.ngoVerificationStatus !== 'APPROVED') {
      return;
    }
    try {
      setRefreshing(true);
      const activeCoords = coords || gpsCoords;
      const locQuery = activeCoords ? `&longitude=${activeCoords.lng}&latitude=${activeCoords.lat}` : '';

      const [nearbyRes, pipelineRes] = await Promise.all([
        apiClient.get(`/donations/nearby?radius=${radius}${locQuery}`),
        apiClient.get('/donations?status=')
      ]);

      setNearby(nearbyRes.data.donations || []);
      setLocationKnown(nearbyRes.data.locationKnown !== false);
      
      const allDonations = pipelineRes.data.donations || pipelineRes.data || [];
      setPipeline(allDonations.filter((d: any) => ['NGO_ACCEPTED', 'VOLUNTEER_ASSIGNED', 'GOING_TO_PICKUP', 'PICKED_UP', 'IN_TRANSIT'].includes(d.status)));
      setHistory(allDonations.filter((d: any) => ['DELIVERED', 'COMPLETED', 'DISTRIBUTED'].includes(d.status)));
    } catch (err) {
      console.error('[NgoDashboard] Fetch failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const openMaps = (lat: number, lng: number, label: string) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  const useGPS = async () => {
    setGpsLoading(true);
    setGpsError(null);
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setGpsError('Location permission denied.');
        setGpsLoading(false);
        fetchDashboardData();
        return;
      }
    }
    Geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lng: pos.coords.longitude, lat: pos.coords.latitude };
        setGpsCoords(coords);
        setGpsLoading(false);
        fetchDashboardData(coords);
      },
      () => {
        setGpsLoading(false);
        setGpsError('Unable to get location.');
        fetchDashboardData();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  useFocusEffect(
    useCallback(() => {
      useGPS();
    }, [radius])
  );

  useEffect(() => {
    const unsub1 = SocketService.on('new_donation', () => {
      fetchDashboardData();
    });
    const unsub2 = SocketService.on('donation_updated', () => {
      fetchDashboardData();
    });
    const unsub3 = SocketService.on('new_notification', () => {
      fetchDashboardData();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const openClaimModal = (donationId: string) => {
    setClaimModalTarget(donationId);
    const initialCoords: [number, number] = gpsCoords
      ? [gpsCoords.lng, gpsCoords.lat]
      : [user?.location?.coordinates?.[0] || 80.016108, user?.location?.coordinates?.[1] || 13.028344];

    setClaimLocationData({
      address: user?.address || 'Saveetha College of Architecture and Design (SCAD), Thandalam, Sriperumbudur, Tamil Nadu, India',
      coordinates: initialCoords,
    });
  };

  const handleConfirmClaim = async () => {
    if (!claimModalTarget || !claimLocationData) return;

    try {
      setRefreshing(true);
      await apiClient.put(`/donations/${claimModalTarget}/accept`, {
        destinationAddress: claimLocationData.address,
        destinationCoordinates: claimLocationData.coordinates,
      });
      setClaimModalTarget(null);
      setClaimLocationData(null);
      Alert.alert('Claimed!', 'Surplus donation successfully claimed.');
      await fetchDashboardData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Error claiming surplus donation.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkDistributed = (donationId: string, donorId: string) => {
    setDistributingId(donationId);
    setRatingTarget(donorId);
    setRatingScore(5);
    setRatingModalVisible(true);
  };

  const submitDistributionWithRating = async () => {
    if (!distributingId) return;
    try {
      setRefreshing(true);
      setRatingModalVisible(false);

      // Mark as DISTRIBUTED
      await apiClient.put(`/donations/${distributingId}/status`, { status: 'DISTRIBUTED' });

      // Submit donor rating if target exists
      if (ratingTarget) {
        try {
          await apiClient.post(`/users/${ratingTarget}/rate`, { score: ratingScore });
        } catch (rateErr) {
          console.warn('[NgoDashboard] Rating failed (non-critical):', rateErr);
        }
      }

      Alert.alert('Success', 'Marked as Distributed! Thank you for rating the donor.');
      fetchDashboardData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Error updating status');
    } finally {
      setRefreshing(false);
      setDistributingId(null);
      setRatingTarget(null);
    }
  };

  if (user?.role === 'NGO' && (user?.approvalStatus !== 'approved' || user?.ngoVerificationStatus !== 'APPROVED')) {
    if (user?.approvalStatus === 'rejected' || user?.ngoVerificationStatus === 'REJECTED') {
      return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <View style={[styles.errorIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
            <XCircle size={64} color="#EF4444" />
          </View>
          <Text style={[styles.errorTitle, { textAlign: 'center' }]}>Your NGO account has not been approved.</Text>
          <Text style={styles.errorDesc}>Please contact administration if you believe this is a mistake.</Text>
        </View>
      );
    }
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={styles.errorIconWrapper}>
          <Landmark size={64} color="#F59E0B" />
        </View>
        <Text style={[styles.errorTitle, { textAlign: 'center' }]}>Your account is waiting for admin approval.</Text>
        <Text style={styles.errorDesc}>
          Your NGO registration is under review. Access to surplus posts will unlock once approved.
        </Text>
      </View>
    );
  }

  const statCards = [
    { label: 'Surplus Radar', value: nearby.length, sub: 'Claimable food', Icon: Compass, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    { label: 'Active Pipeline', value: pipeline.length, sub: 'In progress', Icon: Clock, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
    { label: 'History', value: history.length, sub: 'Completed runs', Icon: History, color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark900 }}>
      <Header title="NGO Console" />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData()} tintColor="#10B981" />}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Compass size={28} color="#10B981" />
              <Text style={styles.title}>NGO Console</Text>
            </View>
            <Text style={styles.subtitle}>Hello, {user?.name}. Browse nearby active surplus food posts and coordinate pickups.</Text>
          </View>
          <TouchableOpacity onPress={() => fetchDashboardData()} disabled={refreshing} style={styles.iconBtn}>
            <RefreshCw size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={useGPS} style={styles.gpsBtn}>
            {gpsLoading ? <RefreshCw size={14} color="#10B981" style={{ marginRight: 6 }} /> : <Navigation size={14} color="#10B981" style={{ marginRight: 6 }} />}
            <Text style={styles.gpsBtnText}>{gpsLoading ? 'Detecting...' : gpsCoords ? 'GPS Active' : 'Use My GPS'}</Text>
          </TouchableOpacity>

          <View style={styles.radiusSelector}>
            <Text style={styles.radiusLabel}>Scan Radius:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 8 }}>
              {[5, 10, 15].map(rad => (
                <TouchableOpacity key={rad} onPress={() => setRadius(rad)} style={radius === rad ? styles.radBtnActive : styles.radBtn}>
                  <Text style={radius === rad ? styles.radBtnTextActive : styles.radBtnText}>{rad}KM</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {!locationKnown && (
        <View style={[styles.alertBanner, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
          <AlertTriangle size={20} color="#F59E0B" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.alertTitle, { color: '#F59E0B' }]}>Location Not Set</Text>
            <Text style={styles.alertText}>Your NGO hub GPS coordinates are not configured. Click "Use My GPS" for proximity scanning.</Text>
          </View>
        </View>
      )}

      {gpsError && (
        <View style={styles.alertBanner}>
          <Navigation size={20} color="#F87171" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.alertTitle}>GPS Error</Text>
            <Text style={styles.alertText}>{gpsError}</Text>
          </View>
        </View>
      )}

      <View style={styles.statsGrid}>
        {statCards.map((card, idx) => (
          <View key={idx} style={styles.statCardContainer}>
            <View style={styles.glassPanel}>
              <View style={[styles.statIconWrapper, { backgroundColor: card.bg }]}>
                <card.Icon size={20} color={card.color} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statLabel} numberOfLines={1}>{card.label}</Text>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statSub} numberOfLines={1}>{card.sub}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* NGO Tab Navigation */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity onPress={() => setActiveTab('radar')} style={activeTab === 'radar' ? styles.tabBtnActive : styles.tabBtn}>
            <Text style={activeTab === 'radar' ? styles.tabTextActive : styles.tabText}>Surplus Radar ({nearby.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('pipeline')} style={activeTab === 'pipeline' ? styles.tabBtnActive : styles.tabBtn}>
            <Text style={activeTab === 'pipeline' ? styles.tabTextActive : styles.tabText}>Active Pipeline ({pipeline.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('history')} style={activeTab === 'history' ? styles.tabBtnActive : styles.tabBtn}>
            <Text style={activeTab === 'history' ? styles.tabTextActive : styles.tabText}>History ({history.length})</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.mainGrid}>
        {/* TAB 1: SURPLUS RADAR */}
        {activeTab === 'radar' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Surplus Posts</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{nearby.length} Available</Text>
              </View>
            </View>

            {nearby.length === 0 ? (
              <View style={styles.emptyCard}>
                <Compass size={40} color="#64748B" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No unclaimed food surplus found inside {radius} KM.</Text>
              </View>
            ) : (
              nearby.map((item) => {
                const isUnknown = item.distance === -1;
                return (
                  <View key={item._id} style={styles.listingCard}>
                    <View style={styles.distBadgeAbsolute}>
                      <MapPin size={12} color={isUnknown ? '#94A3B8' : '#10B981'} style={{marginRight: 4}} />
                      <Text style={[styles.distText, { color: isUnknown ? '#94A3B8' : '#10B981' }]}>
                        {isUnknown ? 'Unknown' : `${item.distance} KM`}
                      </Text>
                    </View>

                    <Text style={styles.catText}>{item.foodCategory}</Text>
                    <Text style={styles.foodName}>{item.foodName}</Text>

                    {item.pickupAddress && (
                      <View style={styles.addressRow}>
                        <MapPin size={12} color="#64748B" />
                        <Text style={styles.addressText} numberOfLines={1}>{item.pickupAddress}</Text>
                      </View>
                    )}

                    <View style={styles.infoGrid}>
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Quantity</Text>
                        <Text style={styles.infoVal}>{item.quantity} {item.unit}</Text>
                      </View>
                      <View style={[styles.infoCol, { alignItems: 'flex-end' }]}>
                        <Text style={styles.infoLabel}>Expiry</Text>
                        <Text style={[styles.infoVal, item.aiRiskLevel === 'danger' && { color: '#EF4444' }]}>
                          {item.aiSafeWindowHours} Hours Left
                        </Text>
                      </View>
                    </View>

                    <View style={styles.donorRow}>
                      <View style={styles.donorAvatar}>
                        <Text style={styles.donorAvatarText}>{(item.donor?.name || 'D').charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.donorName}>{item.donor?.name || 'Donor'}</Text>
                        <Text style={styles.donorScore}>Trust Score: {item.donor?.trustScore || 85}</Text>
                      </View>
                    </View>

                    {item.specialInstructions && (
                      <View style={styles.instructionsBox}>
                        <Text style={styles.instLabel}>🏢 Building / Location Instructions:</Text>
                        <Text style={styles.instText}>{item.specialInstructions}</Text>
                      </View>
                    )}

                    <TouchableOpacity style={styles.claimBtn} onPress={() => openClaimModal(item._id)}>
                      <CheckSquare size={16} color="#0F172A" style={{marginRight: 8}} />
                      <Text style={styles.claimBtnText}>Claim Surplus Food</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: ACTIVE PIPELINE */}
        {activeTab === 'pipeline' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Claims Pipeline</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{pipeline.length} Active</Text>
              </View>
            </View>

            {pipeline.length === 0 ? (
              <View style={styles.emptyCard}>
                <Clock size={40} color="#64748B" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No claimed surpluses actively processing right now.</Text>
              </View>
            ) : (
              pipeline.map(item => (
                <View key={item._id} style={styles.pipelineCard}>
                  <View style={styles.flexRowBetween}>
                    <Text style={styles.foodName}>{item.foodName}</Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.catText}>Qty: {item.quantity} {item.unit} • {item.foodCategory || 'Food'}</Text>
                  <Text style={styles.infoText}>Donor: {item.donor?.name || 'Donor'}</Text>

                  {item.pickupAddress && (
                    <View style={styles.addressRow}>
                      <MapPin size={12} color="#64748B" />
                      <Text style={styles.addressText} numberOfLines={1}>Pickup: {item.pickupAddress}</Text>
                    </View>
                  )}

                  {item.specialInstructions && (
                    <View style={styles.instructionsBox}>
                      <Text style={styles.instLabel}>🏢 Special Instructions:</Text>
                      <Text style={styles.instText}>{item.specialInstructions}</Text>
                    </View>
                  )}

                  <View style={styles.pipelineActionRow}>
                    <TouchableOpacity
                      style={styles.trackDetailsBtn}
                      onPress={() => setTrackTarget(item)}
                    >
                      <Navigation size={14} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={styles.trackDetailsBtnText}>Track Details</Text>
                    </TouchableOpacity>

                    {item.status === 'DELIVERED' && (
                      <TouchableOpacity
                        style={styles.distributeBtn}
                        onPress={() => handleMarkDistributed(item._id, item.donor?._id)}
                      >
                        <Text style={styles.distributeBtnText}>Log Distribution</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Claimed & Distributed History</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{history.length} Completed</Text>
              </View>
            </View>

            {history.length === 0 ? (
              <View style={styles.emptyCard}>
                <History size={40} color="#64748B" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No historical completed donations yet.</Text>
              </View>
            ) : (
              history.map(item => (
                <View key={item._id} style={styles.historyCard}>
                  <View style={styles.flexRowBetween}>
                    <Text style={styles.foodName}>{item.foodName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
                      <Text style={[styles.statusText, { color: '#10B981' }]}>{item.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.catText}>Qty: {item.quantity} {item.unit} • Donor: {item.donor?.name || 'Donor'}</Text>
                  <Text style={styles.historyDateText}>Completed on: {formatISTDateTime(item.updatedAt || item.createdAt)}</Text>

                  {item.status === 'DELIVERED' && (
                    <TouchableOpacity
                      style={[styles.distributeBtn, { marginTop: 10 }]}
                      onPress={() => handleMarkDistributed(item._id, item.donor?._id)}
                    >
                      <Text style={styles.distributeBtnText}>Log Distribution & Rate Donor</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </View>
      <View style={{ height: 20 }} />
      </ScrollView>

      {/* Track Details Modal */}
      <Modal
        visible={!!trackTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setTrackTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Navigation size={20} color="#10B981" />
                  <Text style={styles.modalTitle}>Track Run Details</Text>
                </View>
                <TouchableOpacity onPress={() => setTrackTarget(null)}>
                  <XCircle size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              {trackTarget && (
                <View style={{ gap: 14 }}>
                  <View style={styles.trackInfoBox}>
                    <Text style={styles.trackFoodName}>{trackTarget.foodName}</Text>
                    <Text style={styles.trackFoodSub}>Qty: {trackTarget.quantity} {trackTarget.unit} • {trackTarget.foodCategory || 'Food'}</Text>
                    <View style={[styles.statusBadge, { marginTop: 8, alignSelf: 'flex-start' }]}>
                      <Text style={styles.statusText}>STATUS: {trackTarget.status}</Text>
                    </View>
                  </View>

                  {/* Volunteer assignment info */}
                  <View style={styles.trackSectionBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Truck size={15} color="#3B82F6" />
                      <Text style={styles.trackSectionTitle}>Assigned Volunteer</Text>
                    </View>
                    <Text style={styles.trackSectionValue}>
                      {trackTarget.volunteer?.name || trackTarget.assignedVolunteer?.name || (trackTarget.status === 'NGO_ACCEPTED' ? 'Awaiting Volunteer Claim' : 'Assigned')}
                    </Text>
                    {trackTarget.volunteer?.phone && (
                      <Text style={styles.trackSectionSub}>Phone: {trackTarget.volunteer.phone}</Text>
                    )}
                  </View>

                  {/* Pickup coordinates & address */}
                  {trackTarget.pickupAddress && (
                    <View style={styles.trackSectionBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <MapPin size={15} color="#F59E0B" />
                        <Text style={styles.trackSectionTitle}>Pickup Location</Text>
                      </View>
                      <Text style={styles.trackSectionValue}>{trackTarget.pickupAddress}</Text>
                      {trackTarget.location?.coordinates && (
                        <TouchableOpacity
                          style={styles.openMapActionBtn}
                          onPress={() => openMaps(trackTarget.location.coordinates[1], trackTarget.location.coordinates[0], "Pickup Location")}
                        >
                          <Navigation size={13} color="#0F172A" style={{ marginRight: 6 }} />
                          <Text style={styles.openMapActionBtnText}>Open Pickup in Google Maps</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Dropoff destination */}
                  {(trackTarget.destinationLocation?.address || trackTarget.ngo?.address || user?.address) && (
                    <View style={styles.trackSectionBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Landmark size={15} color="#10B981" />
                        <Text style={styles.trackSectionTitle}>Dropoff Destination</Text>
                      </View>
                      <Text style={styles.trackSectionValue}>
                        {trackTarget.destinationLocation?.address || trackTarget.ngo?.address || user?.address}
                      </Text>
                      {(trackTarget.destinationLocation?.coordinates || trackTarget.ngo?.location?.coordinates || user?.location?.coordinates) && (
                        <TouchableOpacity
                          style={[styles.openMapActionBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => {
                            const coords = trackTarget.destinationLocation?.coordinates || trackTarget.ngo?.location?.coordinates || user?.location?.coordinates;
                            openMaps(coords[1], coords[0], "NGO Dropoff");
                          }}
                        >
                          <Navigation size={13} color="#0F172A" style={{ marginRight: 6 }} />
                          <Text style={styles.openMapActionBtnText}>Open Dropoff in Google Maps</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.closeTrackModalBtn}
                    onPress={() => setTrackTarget(null)}
                  >
                    <Text style={styles.closeTrackModalBtnText}>Close Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NGO Receiver Destination Location Modal */}
      <Modal
        visible={!!claimModalTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setClaimModalTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <ScrollView style={{ width: '100%' }}>
              <Text style={styles.modalTitle}>Confirm Dropoff Location 📍</Text>
              <Text style={styles.modalSub}>
                Select or confirm your NGO dropoff destination on the map below before claiming.
              </Text>

              <LocationPicker
                label="Destination Location"
                initialAddress={claimLocationData?.address || user?.address || ''}
                initialCoordinates={claimLocationData?.coordinates}
                onChange={({ address: newAddr, coordinates }) => {
                  setClaimLocationData({ address: newAddr, coordinates });
                }}
              />

              <TouchableOpacity
                style={[styles.submitRatingBtn, { marginTop: 16 }]}
                onPress={handleConfirmClaim}
              >
                <Text style={styles.submitRatingBtnText}>Confirm Location & Claim Surplus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.skipRatingBtn, { marginTop: 8 }]}
                onPress={() => setClaimModalTarget(null)}
              >
                <Text style={styles.skipRatingBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Donor Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Distribution Logged 🎉</Text>
            <Text style={styles.modalSub}>Rate the donor's food quality</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingScore(star)}>
                  <Star
                    size={36}
                    color={star <= ratingScore ? '#F59E0B' : '#334155'}
                    fill={star <= ratingScore ? '#F59E0B' : 'transparent'}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingLabel}>{ratingScore}/5 Stars</Text>

            <TouchableOpacity style={styles.submitRatingBtn} onPress={submitDistributionWithRating}>
              <Text style={styles.submitRatingBtnText}>Submit & Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipRatingBtn} onPress={() => {
              setRatingScore(0);
              submitDistributionWithRating();
            }}>
              <Text style={styles.skipRatingBtnText}>Skip Rating</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    paddingBottom: 16,
    backgroundColor: COLORS.dark900,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
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
  iconBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gpsBtnText: {
    color: COLORS.brand,
    fontWeight: 'bold',
    fontSize: 12,
  },
  radiusSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  radiusLabel: {
    color: COLORS.slate400,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  radBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  radBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  radBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  radBtnTextActive: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertBanner: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertTitle: {
    color: COLORS.red400,
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCardContainer: {
    width: '50%',
    padding: 8,
  },
  glassPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    color: COLORS.slate400,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  statSub: {
    color: COLORS.slate500,
    fontSize: 9,
  },
  mainGrid: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  badgeCount: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeCountText: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    marginTop: 20,
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.slate400,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    position: 'relative',
  },
  distBadgeAbsolute: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  foodName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    paddingRight: 80,
    marginBottom: 8,
  },
  catText: {
    color: COLORS.slate500,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    marginBottom: 16,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.slate500,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoVal: {
    color: COLORS.slate200,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  donorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  donorAvatar: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginRight: 12,
  },
  donorAvatarText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  donorName: {
    color: COLORS.slate300,
    fontSize: 11,
    fontWeight: 'bold',
  },
  donorScore: {
    color: COLORS.slate500,
    fontSize: 9,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  instructionsBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  instLabel: {
    color: COLORS.amber400,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  instText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  claimBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  pipelineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 12,
    marginBottom: 12,
  },
  statusText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pipelineActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pendingText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  distributeBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  distributeBtnText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: 'bold',
  },
  trackBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackBtnText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  errorIconWrapper: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 24,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  errorTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorDesc: {
    color: COLORS.slate400,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  // Rating Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    color: COLORS.slate400,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  ratingLabel: {
    color: '#F59E0B',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 24,
  },
  submitRatingBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitRatingBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  skipRatingBtn: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtnActive: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  tabText: {
    color: COLORS.slate400,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  trackDetailsBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackDetailsBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 18,
    marginTop: 14,
  },
  historyDateText: {
    color: COLORS.slate500,
    fontSize: 11,
    marginTop: 4,
  },
  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    color: COLORS.slate400,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  // Track Modal Styles
  trackInfoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
  },
  trackFoodName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trackFoodSub: {
    color: COLORS.slate400,
    fontSize: 12,
    marginTop: 4,
  },
  trackSectionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
  },
  trackSectionTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  trackSectionValue: {
    color: COLORS.slate300,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  trackSectionSub: {
    color: '#3B82F6',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  openMapActionBtn: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  openMapActionBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  closeTrackModalBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  closeTrackModalBtnText: {
    color: COLORS.slate300,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
