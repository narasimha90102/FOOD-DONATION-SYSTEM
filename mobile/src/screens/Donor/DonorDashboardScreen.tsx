import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { apiClient } from '../../api/client';
import { SocketService } from '../../services/socketService';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { formatDateOnly, formatISTDateTime } from '../../utils/formatDate';
import { Heart, Compass, ShieldCheck, Award, RefreshCw, BarChart2, PlusCircle, MessageSquare } from 'lucide-react-native';

export const DonorDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, historyRes] = await Promise.all([
        apiClient.get('/donations/donor-stats'),
        apiClient.get('/donations?status=')
      ]);
      setStats(statsRes.data.stats);
      setHistory(historyRes.data.donations);
    } catch (err) {
      console.error('[DonorDashboard] Fetch failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

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

  const handleCancelDonation = async (donationId: string) => {
    Alert.alert(
      "Cancel Donation",
      "Are you sure you want to cancel this donation?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            try {
              setRefreshing(true);
              await apiClient.put(`/donations/${donationId}/status`, { status: 'CANCELLED' });
              await fetchDashboardData();
            } catch (err: any) {
              Alert.alert("Error", err.response?.data?.message || "Failed to cancel donation.");
            } finally {
              setRefreshing(false);
            }
          }
        }
      ]
    );
  };

  const statCards = [
    { label: 'Total Listings', value: stats?.totalDonationsPosted ?? 0, sub: 'All time posts', Icon: Heart, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    { label: 'Active Now', value: stats?.activeDonationsCount ?? 0, sub: 'Awaiting / In transit', Icon: Compass, color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)' },
    { label: 'Completed', value: stats?.completedDonationsCount ?? 0, sub: 'Successfully delivered', Icon: BarChart2, color: '#2DD4BF', bg: 'rgba(45, 212, 191, 0.1)' },
    { label: 'Trust Index', value: `${stats?.trustScore ?? 85}%`, sub: 'Donor reliability', Icon: ShieldCheck, color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return { text: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', label: '🟢 Available' };
      case 'ACCEPTED': return { text: '#2DD4BF', bg: 'rgba(45, 212, 191, 0.1)', border: 'rgba(45, 212, 191, 0.2)', label: '✅ Accepted by NGO' };
      case 'PICKED_UP': return { text: '#FBBF24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.2)', label: '🚚 En Route' };
      case 'COMPLETED': return { text: '#34D399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.2)', label: '🎉 Completed' };
      case 'CANCELLED': return { text: '#F87171', bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.2)', label: '❌ Cancelled' };
      default: return { text: '#94A3B8', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.05)', label: status };
    }
  };



  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark900 }}>
      <Header title="FoodBridge AI" />
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchDashboardData} tintColor="#10B981" />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Surplus Donor Dashboard</Text>
              <Text style={styles.subtitle}>Hello, {user?.name}. Review your active surplus contributions and impact metrics.</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={fetchDashboardData} disabled={refreshing} style={styles.iconBtn}>
                <RefreshCw size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.donateBtn} 
            onPress={() => navigation.navigate('CreateDonation')}
          >
            <PlusCircle size={20} color="#0F172A" style={{ marginRight: 8 }} />
            <Text style={styles.donateBtnText}>Post Surplus Food</Text>
          </TouchableOpacity>
        </View>

      <View style={styles.statsGrid}>
        {statCards.map((card, idx) => (
          <View key={idx} style={styles.statCardContainer}>
            <View style={styles.glassPanel}>
              <View style={[styles.statIconWrapper, { backgroundColor: card.bg }]}>
                <card.Icon size={24} color={card.color} />
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

      <View style={styles.mainGrid}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Surplus History</Text>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{history.length} Total Logs</Text>
          </View>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Compass size={40} color="#64748B" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No food surplus listed yet. Tap the button above to upload a listing.</Text>
          </View>
        ) : (
          history.map((item) => {
            const sColor = getStatusColor(item.status);
            const isDanger = item.aiRiskLevel === 'danger';
            const isWarning = item.aiRiskLevel === 'warning';
            return (
              <View key={item._id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.titleRow}>
                    <Text style={styles.foodName}>{item.foodName}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{item.foodCategory}</Text>
                    </View>
                  </View>
                  <Text style={styles.historySub}>
                    Quantity: <Text style={{fontWeight: 'bold', color: '#FFFFFF'}}>{item.quantity} {item.unit}</Text> | Uploaded: {formatDateOnly(item.createdAt)}
                    {item.estimatedExpiryTime ? ` | Consume By: ${formatISTDateTime(item.estimatedExpiryTime)}` : ''}
                  </Text>
                </View>

                <View style={styles.historyFooter}>
                  <View style={[styles.statusBadge, { backgroundColor: sColor.bg, borderColor: sColor.border }]}>
                    <Text style={[styles.statusText, { color: sColor.text }]}>{sColor.label}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    {!['COMPLETED', 'DELIVERED', 'DISTRIBUTED', 'CANCELLED', 'EXPIRED'].includes(item.status) && (
                      <>
                        <TouchableOpacity onPress={() => navigation.navigate('Donate', { id: item._id })} style={styles.editBtn}>
                          <Text style={styles.editBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleCancelDonation(item._id)} style={styles.cancelBtn}>
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {(item.status === 'ACCEPTED' || item.status === 'PICKED_UP') && (
                      <TouchableOpacity onPress={() => navigation.navigate('Chat', { donationId: item._id })} style={styles.chatBtn}>
                        <MessageSquare size={16} color="#CBD5E1" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: COLORS.dark900,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.slate400,
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  donateBtn: {
    marginTop: 20,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  donateBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    color: COLORS.slate400,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statValue: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  statSub: {
    color: COLORS.slate500,
    fontSize: 10,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeCountText: {
    color: COLORS.slate400,
    fontSize: 11,
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
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  historyHeader: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  foodName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: COLORS.slate300,
    fontSize: 10,
    fontWeight: 'bold',
  },
  historySub: {
    color: COLORS.slate400,
    fontSize: 12,
    marginTop: 4,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  aiText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  aiScoreBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiScore: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  riskBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 24,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    color: COLORS.slate300,
    fontSize: 11,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 6,
    borderRadius: 8,
  },
  certificatePanel: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  certIconWrapper: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 16,
    borderRadius: 50,
    marginBottom: 16,
  },
  certTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  certDesc: {
    color: COLORS.slate400,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
  certBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  certBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

