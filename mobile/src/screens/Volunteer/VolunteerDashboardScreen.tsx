import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, PermissionsAndroid, Platform, Linking, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { SocketService } from '../../services/socketService';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { formatISTDateTime } from '../../utils/formatDate';
import { LocationService } from '../../services/locationService';
import { Compass, MapPin, Navigation, RefreshCw, CheckCircle2, Truck, Clock, ShieldCheck, XCircle, Camera, UploadCloud, Trash2 } from 'lucide-react-native';
import Geolocation from '@react-native-community/geolocation';

export const VolunteerDashboardScreen = ({ navigation }: any) => {
  const { user, token } = useAuth();

  const [availablePickups, setAvailablePickups] = useState<any[]>([]);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<any[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'radar' | 'active' | 'history'>('radar');

  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);

  // Cancellation modal state with mandatory photo proof
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTaskId, setCancelTaskId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelPhoto, setCancelPhoto] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Socket setup for live GPS updates and real-time data sync
  useEffect(() => {
    const handleDonationSync = () => {
      fetchDashboardData();
    };

    const unsub1 = SocketService.on('donation_updated', handleDonationSync);
    const unsub2 = SocketService.on('donation:updated', handleDonationSync);
    const unsub3 = SocketService.on('donation_created', handleDonationSync);
    const unsub4 = SocketService.on('donation:created', handleDonationSync);
    const unsub5 = SocketService.on('donation:statusChanged', handleDonationSync);
    const unsub6 = SocketService.on('donation_cancelled', handleDonationSync);
    const unsub7 = SocketService.on('donation:cancelled', handleDonationSync);
    const unsub8 = SocketService.on('new_notification', handleDonationSync);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
    };
  }, []);

  const emitGpsLocation = (coords: [number, number], donationId?: string) => {
    if (donationId) {
      SocketService.emitVolunteerLocation(donationId, coords[0], coords[1]);
    }
  };

  const requestGps = async (): Promise<[number, number] | null> => {
    try {
      const loc = await LocationService.getCurrentLocation();
      const coords: [number, number] = [loc.longitude, loc.latitude];
      setGpsCoords(coords);
      emitGpsLocation(coords);

      // Persist volunteer location to MongoDB profile
      apiClient.put('/auth/profile', { coordinates: coords }).catch(() => {});

      return coords;
    } catch {
      return null;
    }
  };

  const fetchDashboardData = async () => {
    if (user?.role === 'VOLUNTEER' && user?.approvalStatus !== 'approved') return;

    try {
      setRefreshing(true);
      const vLng = gpsCoords ? gpsCoords[0] : (user?.location?.coordinates?.[0] || 0);
      const vLat = gpsCoords ? gpsCoords[1] : (user?.location?.coordinates?.[1] || 0);
      const queryStr = (vLng !== 0 || vLat !== 0) ? `?longitude=${vLng}&latitude=${vLat}` : '';

      const res = await apiClient.get('/donations' + queryStr);
      const allDonations = res.data.donations || [];

      const available = allDonations.filter((d: any) => d.status === 'NGO_ACCEPTED' && !d.volunteer);
      const active = allDonations.filter(
        (d: any) => d.volunteer && (d.volunteer._id || d.volunteer) === user?._id &&
             !['DELIVERED', 'DISTRIBUTED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(d.status)
      );
      const completed = allDonations.filter(
        (d: any) => d.volunteer && (d.volunteer._id || d.volunteer) === user?._id &&
             ['DELIVERED', 'DISTRIBUTED', 'COMPLETED'].includes(d.status)
      );

      setAvailablePickups(available);
      setActiveTasks(active);
      setCompletedDeliveries(completed);

      // If active tasks exist, start live GPS tracking
      if (active.length > 0) {
        const primaryTask = active[0];
        LocationService.startLocationTracking((coords) => {
          const freshCoords: [number, number] = [coords.longitude, coords.latitude];
          setGpsCoords(freshCoords);
          SocketService.emitVolunteerLocation(primaryTask._id, coords.longitude, coords.latitude);
          apiClient.put('/auth/profile', { coordinates: freshCoords }).catch(() => {});
        });
      } else {
        LocationService.stopLocationTracking();
      }
    } catch (err) {
      console.error('[VolunteerDashboard] Fetch failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
      return () => {
        LocationService.stopLocationTracking();
      };
    }, [])
  );

  const handleClaimPickup = async (donationId: string) => {
    try {
      setRefreshing(true);
      const coords = await requestGps();
      const payload: any = {};
      if (coords) {
        payload.volunteerLocation = { type: 'Point', coordinates: coords };
      }
      await apiClient.put(`/donations/${donationId}/assign-volunteer`, payload);
      await fetchDashboardData();
      setActiveTab('active');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Error claiming pickup task.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (donationId: string, nextStatus: string) => {
    try {
      setRefreshing(true);
      const coords = await requestGps();
      const payload: any = { status: nextStatus };
      if (coords) {
        payload.volunteerLocation = { type: 'Point', coordinates: coords };
      }
      await apiClient.put(`/donations/${donationId}/status`, payload);
      if (['DELIVERED', 'DISTRIBUTED', 'COMPLETED', 'CANCELLED'].includes(nextStatus)) {
        LocationService.stopLocationTracking();
      }
      await fetchDashboardData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Error updating task status.');
    } finally {
      setRefreshing(false);
    }
  };

  const confirmDelivered = (donationId: string) => {
    Alert.alert(
      'Confirm Delivery',
      'Confirm that the food has been delivered to the NGO?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Delivered',
          style: 'default',
          onPress: () => handleUpdateStatus(donationId, 'DELIVERED'),
        },
      ]
    );
  };

  const openCancelModal = (donationId: string) => {
    setCancelTaskId(donationId);
    setCancelReason('');
    setCancelPhoto('');
    setShowCancelModal(true);
  };

  const submitCancellation = async () => {
    if (!cancelTaskId) return;

    if (!cancelReason.trim()) {
      Alert.alert('Reason Required', 'Please explain the reason for cancellation.');
      return;
    }

    if (!cancelPhoto) {
      Alert.alert('Photo Proof Required', 'Please upload or select photo proof before cancelling.');
      return;
    }

    try {
      setCancelLoading(true);
      await apiClient.put(`/donations/${cancelTaskId}/volunteer-cancel`, {
        reason: cancelReason,
        proofPhoto: cancelPhoto,
      });
      setShowCancelModal(false);
      setCancelTaskId(null);
      setCancelReason('');
      setCancelPhoto('');
      Alert.alert('Cancelled', 'Task has been cancelled and verified by photo proof.');
      await fetchDashboardData();
    } catch (err: any) {
      Alert.alert('Cancellation Error', err.response?.data?.message || 'Failed to submit cancellation.');
    } finally {
      setCancelLoading(false);
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

  if (user?.role === 'VOLUNTEER' && user?.approvalStatus !== 'approved') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={styles.errorIconWrapper}>
          <Compass size={64} color="#F59E0B" />
        </View>
        <Text style={[styles.errorTitle, { textAlign: 'center' }]}>Waiting for Admin Approval</Text>
        <Text style={styles.errorDesc}>
          Your Volunteer registration is under review. Access to tracking maps and delivery tasks will unlock once approved.
        </Text>
      </View>
    );
  }

  const statCards = [
    { label: 'Available Runs', value: availablePickups.length, sub: 'Claimable pickups', Icon: Compass, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    { label: 'Active Pipeline', value: activeTasks.length, sub: 'Currently assigned', Icon: Clock, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
    { label: 'Completed Runs', value: completedDeliveries.length, sub: 'Successfully delivered', Icon: CheckCircle2, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark900 }}>
      <Header title="Volunteer Hub" />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboardData} tintColor="#10B981" />}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Truck size={28} color="#10B981" />
              <Text style={styles.title}>Volunteer Hub</Text>
            </View>
            <Text style={styles.subtitle}>Hello, {user?.name}. Claim available NGO pickup runs and track route milestones.</Text>
          </View>
          <TouchableOpacity onPress={() => fetchDashboardData()} disabled={refreshing} style={styles.iconBtn}>
            <RefreshCw size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

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

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity onPress={() => setActiveTab('radar')} style={activeTab === 'radar' ? styles.tabBtnActive : styles.tabBtn}>
            <Text style={activeTab === 'radar' ? styles.tabTextActive : styles.tabText}>Pickup Radar ({availablePickups.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('active')} style={activeTab === 'active' ? styles.tabBtnActive : styles.tabBtn}>
            <Text style={activeTab === 'active' ? styles.tabTextActive : styles.tabText}>Active Job ({activeTasks.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('history')} style={activeTab === 'history' ? styles.tabBtnActive : styles.tabBtn}>
            <Text style={activeTab === 'history' ? styles.tabTextActive : styles.tabText}>History ({completedDeliveries.length})</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.mainGrid}>
        {activeTab === 'radar' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Claimable Pickups</Text>
            </View>

            {availablePickups.length === 0 ? (
              <View style={styles.emptyCard}>
                <Compass size={40} color="#64748B" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No unclaimed pickup runs are active on the network. Check back soon!</Text>
              </View>
            ) : (
              availablePickups.map((item) => (
                <View key={item._id} style={styles.listingCard}>
                  <Text style={styles.catText}>{item.foodCategory}</Text>
                  <Text style={styles.foodName}>{item.foodName}</Text>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <MapPin size={12} color="#64748B" />
                    <Text style={styles.infoText}>From: <Text style={{fontWeight: 'bold', color: COLORS.white}}>{item.pickupAddress}</Text></Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Navigation size={12} color="#64748B" />
                    <Text style={styles.infoText}>To NGO: <Text style={{fontWeight: 'bold', color: COLORS.white}}>{item.ngo?.name || 'Assigned NGO'}</Text> ({item.destinationAddress || item.ngo?.address})</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Compass size={12} color="#10B981" />
                    <Text style={styles.infoText}>Vol → Pickup: <Text style={{fontWeight: 'bold', color: '#10B981'}}>{item.distance !== -1 ? `${item.distance} km` : 'Location unavailable'}</Text></Text>
                  </View>
                  {item.pickupToNgoDistance && item.pickupToNgoDistance !== -1 ? (
                    <View style={styles.infoRow}>
                      <Navigation size={12} color="#60A5FA" />
                      <Text style={styles.infoText}>Pickup → NGO: <Text style={{fontWeight: 'bold', color: '#60A5FA'}}>{item.pickupToNgoDistance} km</Text></Text>
                    </View>
                  ) : null}
                  <View style={styles.infoRow}>
                    <Clock size={12} color="#64748B" />
                    <Text style={styles.infoText}>Qty: <Text style={{fontWeight: 'bold', color: COLORS.white}}>{item.quantity} {item.unit}</Text>
                      {item.estimatedExpiryTime ? (
                        <Text style={{ color: '#F59E0B' }}> | Consume By: {formatISTDateTime(item.estimatedExpiryTime)}</Text>
                      ) : null}
                    </Text>
                  </View>

                  <View style={styles.aiBanner}>
                    <ShieldCheck size={14} color="#10B981" />
                    <Text style={styles.aiBannerText}>AI stability window safe</Text>
                  </View>

                  <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaimPickup(item._id)}>
                    <Compass size={16} color="#0F172A" style={{marginRight: 8}} />
                    <Text style={styles.claimBtnText}>Accept Pickup Run</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'active' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Pickup Run</Text>
            </View>

            {activeTasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Truck size={40} color="#64748B" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No active pickup runs assigned. Browse the radar to claim one.</Text>
              </View>
            ) : (
              activeTasks.map((item) => (
                <View key={item._id} style={styles.listingCard}>
                  <View style={styles.flexRowBetween}>
                    <View style={{flex: 1}}>
                      <Text style={styles.targetLabel}>Active Delivery Target</Text>
                      <Text style={styles.foodName}>{item.foodName}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{item.status.replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                  <Text style={styles.qtyText}>Quantity: {item.quantity} {item.unit}</Text>

                  <View style={styles.divider} />

                  <View style={styles.infoRow}>
                    <MapPin size={12} color="#64748B" />
                    <Text style={styles.infoText}>Pickup: <Text style={{fontWeight: 'bold', color: COLORS.white}}>{item.pickupAddress}</Text></Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Navigation size={12} color="#64748B" />
                    <Text style={styles.infoText}>Dropoff: <Text style={{fontWeight: 'bold', color: COLORS.white}}>{item.ngo?.name}</Text> ({item.destinationAddress || item.ngo?.address})</Text>
                  </View>

                  {item.specialInstructions && (
                    <View style={styles.instructionsBox}>
                      <Text style={styles.instLabel}>🏢 Building / Location Instructions:</Text>
                      <Text style={styles.instText}>{item.specialInstructions}</Text>
                    </View>
                  )}

                  <View style={styles.timelineBox}>
                    <Text style={styles.timelineTitle}>Delivery Milestones</Text>

                    {item.status === 'VOLUNTEER_ASSIGNED' && (
                      <TouchableOpacity style={styles.timelineBtn} onPress={() => handleUpdateStatus(item._id, 'GOING_TO_PICKUP')}>
                        <Navigation size={16} color="#0F172A" style={{marginRight: 8}} />
                        <Text style={styles.timelineBtnText}>Start Pickup Run</Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'GOING_TO_PICKUP' && (
                      <TouchableOpacity style={[styles.timelineBtn, { backgroundColor: '#F59E0B' }]} onPress={() => handleUpdateStatus(item._id, 'PICKED_UP')}>
                        <CheckCircle2 size={16} color="#0F172A" style={{marginRight: 8}} />
                        <Text style={styles.timelineBtnText}>Confirm Food Collected</Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'PICKED_UP' && (
                      <TouchableOpacity style={styles.timelineBtn} onPress={() => handleUpdateStatus(item._id, 'IN_TRANSIT')}>
                        <Truck size={16} color="#0F172A" style={{marginRight: 8}} />
                        <Text style={styles.timelineBtnText}>Start Delivery Run</Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'IN_TRANSIT' && (
                      <TouchableOpacity style={[styles.timelineBtn, { backgroundColor: '#10B981' }]} onPress={() => confirmDelivered(item._id)}>
                        <CheckCircle2 size={16} color="#0F172A" style={{marginRight: 8}} />
                        <Text style={styles.timelineBtnText}>Delivered</Text>
                      </TouchableOpacity>
                    )}

                    {/* Cancel task button */}
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => openCancelModal(item._id)}
                    >
                      <XCircle size={14} color="#F87171" style={{marginRight: 8}} />
                      <Text style={styles.cancelBtnText}>Cancel Task</Text>
                    </TouchableOpacity>
                  </View>

                  {item.location?.coordinates && (
                    <View style={styles.mapsActions}>
                      <TouchableOpacity
                        onPress={() => openMaps(item.location.coordinates[1], item.location.coordinates[0], "Pickup Location")}
                        style={styles.mapBtn}
                      >
                        <Navigation size={14} color="#F59E0B" style={{marginRight: 8}} />
                        <View>
                          <Text style={styles.mapBtnTitle}>📍 Current Location → 📦 Pickup</Text>
                          <Text style={styles.mapBtnSub}>Opens Google Maps</Text>
                        </View>
                      </TouchableOpacity>

                      {(item.destinationLocation?.coordinates || item.ngo?.location?.coordinates) && (
                        <TouchableOpacity
                          onPress={() => {
                            const coords = item.destinationLocation?.coordinates || item.ngo?.location?.coordinates;
                            openMaps(coords[1], coords[0], "Dropoff Location");
                          }}
                          style={[styles.mapBtn, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}
                        >
                          <Navigation size={14} color="#60A5FA" style={{marginRight: 8}} />
                          <View>
                            <Text style={[styles.mapBtnTitle, { color: COLORS.white }]}>📦 Pickup → 🏢 NGO Destination</Text>
                            <Text style={[styles.mapBtnSub, { color: 'rgba(59, 130, 246, 0.6)' }]}>Opens Google Maps</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery History</Text>
            </View>

            {completedDeliveries.length === 0 ? (
              <View style={styles.emptyCard}>
                <CheckCircle2 size={40} color="#64748B" style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>No completed deliveries yet.</Text>
              </View>
            ) : (
              completedDeliveries.map((item) => (
                <View key={item._id} style={styles.listingCard}>
                  <View style={styles.flexRowBetween}>
                    <Text style={styles.foodName}>{item.foodName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
                      <Text style={[styles.statusText, { color: '#10B981' }]}>DELIVERED</Text>
                    </View>
                  </View>
                  <Text style={styles.infoText}>To: {item.ngo?.name}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </View>

      <View style={{ height: 20 }} />
      </ScrollView>

      {/* Cancellation Modal with Mandatory Photo Proof */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.modalTitle}>Cancel Assigned Task</Text>
                <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                  <XCircle size={22} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSub}>
                To maintain accountability, cancellations require a reason and mandatory photo proof.
              </Text>

              <Text style={styles.inputSectionLabel}>Reason for Cancellation *</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="e.g. Vehicle puncture, roadblock, severe emergency..."
                placeholderTextColor="#64748B"
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.inputSectionLabel}>Photo Proof (Required) *</Text>
              
              {cancelPhoto ? (
                <View style={styles.photoPreviewWrapper}>
                  <Image source={{ uri: cancelPhoto }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setCancelPhoto('')}
                  >
                    <Trash2 size={16} color="#FFFFFF" />
                    <Text style={styles.removePhotoText}>Remove / Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.proofPickerSection}>
                  <Text style={styles.proofPickerHint}>Select photo evidence from scene:</Text>
                  
                  <View style={styles.proofOptionsGrid}>
                    <TouchableOpacity
                      style={styles.proofOptionBtn}
                      onPress={() => setCancelPhoto('https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80')}
                    >
                      <Camera size={18} color="#F59E0B" />
                      <Text style={styles.proofOptionText}>Vehicle Breakdown</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.proofOptionBtn}
                      onPress={() => setCancelPhoto('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80')}
                    >
                      <Camera size={18} color="#3B82F6" />
                      <Text style={styles.proofOptionText}>Route Jam / Accident</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.proofOptionBtn}
                      onPress={() => setCancelPhoto('https://images.unsplash.com/photo-1590402494587-44b71d7772f6?auto=format&fit=crop&w=600&q=80')}
                    >
                      <Camera size={18} color="#EF4444" />
                      <Text style={styles.proofOptionText}>Food Damaged / Leak</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.proofOptionBtn}
                      onPress={() => setCancelPhoto('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80')}
                    >
                      <UploadCloud size={18} color="#10B981" />
                      <Text style={styles.proofOptionText}>Emergency Proof</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.proofWarningText}>⚠️ Photo proof is mandatory before cancelling this task.</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitCancelBtn,
                  (!cancelReason.trim() || !cancelPhoto || cancelLoading) && { opacity: 0.5, backgroundColor: '#475569' },
                ]}
                onPress={submitCancellation}
                disabled={!cancelReason.trim() || !cancelPhoto || cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitCancelBtnText}>
                    {!cancelPhoto ? 'Upload Photo Proof to Cancel' : 'Submit Verified Cancellation'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dismissModalBtn}
                onPress={() => setShowCancelModal(false)}
                disabled={cancelLoading}
              >
                <Text style={styles.dismissModalBtnText}>Keep Assigned Task</Text>
              </TouchableOpacity>
            </ScrollView>
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
  },
  alertText: {
    color: '#F59E0B',
    fontSize: 12,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCardContainer: {
    width: '33.33%',
    padding: 6,
  },
  glassPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    alignItems: 'center',
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
    fontSize: 8,
    textAlign: 'center',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    color: COLORS.slate400,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tabTextActive: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  mainGrid: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 13,
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
  catText: {
    color: COLORS.slate500,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  foodName: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  targetLabel: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  qtyText: {
    color: COLORS.slate400,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 11,
    flex: 1,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
  },
  aiBannerText: {
    color: COLORS.slate400,
    fontSize: 10,
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
    textTransform: 'uppercase',
  },
  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  instructionsBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
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
  timelineBox: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  timelineTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timelineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 10,
  },
  timelineBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  chatBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mapsActions: {
    marginTop: 20,
    gap: 8,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mapBtnTitle: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  mapBtnSub: {
    color: 'rgba(245, 158, 11, 0.6)',
    fontSize: 9,
    marginTop: 2,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    padding: 0,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: '#F87171',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSub: {
    color: COLORS.slate400,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  reasonInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 70,
    marginBottom: 16,
  },
  inputSectionLabel: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  photoPreviewWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#10B981',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  proofPickerSection: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  proofPickerHint: {
    color: COLORS.slate400,
    fontSize: 12,
    marginBottom: 8,
  },
  proofOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  proofOptionBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  proofOptionText: {
    color: COLORS.white,
    fontSize: 11,
    flex: 1,
  },
  proofWarningText: {
    color: '#F59E0B',
    fontSize: 11,
    marginTop: 4,
  },
  submitCancelBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitCancelBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dismissModalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dismissModalBtnText: {
    color: COLORS.slate400,
    fontSize: 13,
    fontWeight: '600',
  },
});
