import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { SocketService } from '../../services/socketService';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../theme/colors';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { Landmark, Users, BarChart3, RefreshCw, CheckCircle2, XCircle, Trash2, Lock, Unlock, Sparkles } from 'lucide-react-native';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'Connected' | 'Disconnected'>('Disconnected');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setRefreshing(true);
      const [analyticRes, usersRes, aiStatusRes] = await Promise.all([
        apiClient.get('/admin/analytics'),
        apiClient.get('/admin/users'),
        apiClient.get('/ai/status').catch(() => ({ data: { status: 'Disconnected' } }))
      ]);

      setAnalytics(analyticRes.data.analytics || null);
      setUsers(usersRes.data.users || []);
      setAiStatus(aiStatusRes.data.status || 'Disconnected');
    } catch (err) {
      console.error('[AdminDashboard] Error fetching metrics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAdminData();
    }, [])
  );

  useEffect(() => {
    const unsub1 = SocketService.on('donation_updated', () => {
      fetchAdminData();
    });
    const unsub2 = SocketService.on('new_donation', () => {
      fetchAdminData();
    });
    const unsub3 = SocketService.on('new_notification', () => {
      fetchAdminData();
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const handleApproveUser = async (userId: string, action: 'approve' | 'reject') => {
    if (action === 'reject') {
      Alert.alert('Confirm Reject', 'Are you sure you want to reject this user?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(userId);
              await apiClient.put(`/admin/users/${userId}/approve`, { action });
              await fetchAdminData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Approval action failed.');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]);
      return;
    }

    try {
      setActionLoading(userId);
      await apiClient.put(`/admin/users/${userId}/approve`, { action });
      await fetchAdminData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Approval action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBlock = async (targetUserId: string) => {
    try {
      setActionLoading(targetUserId);
      await apiClient.put(`/admin/users/${targetUserId}/block`, {});
      await fetchAdminData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Block update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMakeAdmin = async (targetUserId: string) => {
    Alert.alert('Confirm Promtion', 'Promote this user to Administrator?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Promote', 
        onPress: async () => {
          try {
            setActionLoading(targetUserId);
            await apiClient.put(`/admin/users/${targetUserId}/make-admin`, {});
            await fetchAdminData();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Make Admin action failed.');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  const handleDeleteUser = async (targetUserId: string) => {
    Alert.alert('Confirm Delete', 'PERMANENTLY delete this user account?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(targetUserId);
            await apiClient.delete(`/admin/users/${targetUserId}`);
            await fetchAdminData();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Delete user failed.');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  const numericStats = [
    { label: 'Total Donors', value: analytics?.users?.donors || 0, Icon: Users, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
    { label: 'Active NGOs', value: analytics?.users?.ngos || 0, Icon: Landmark, color: '#22D3EE', bg: 'rgba(34, 211, 238, 0.1)' },
    { label: 'Volunteers', value: analytics?.users?.volunteers || 0, Icon: Users, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
    { label: 'Meals Saved', value: analytics?.impact?.mealsSaved || 0, Icon: CheckCircle2, color: '#34D399', bg: 'rgba(52, 211, 153, 0.1)' },
    { label: 'CO2 Offset', value: `${analytics?.impact?.co2Reduction || 0} kg`, Icon: BarChart3, color: '#2DD4BF', bg: 'rgba(45, 212, 191, 0.1)' },
  ];

  const pendingNgosList = users.filter(u => u.role === 'NGO' && (u.approvalStatus === 'pending' || u.ngoVerificationStatus === 'PENDING'));
  const pendingVolunteersList = users.filter(u => u.role === 'VOLUNTEER' && u.approvalStatus === 'pending');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark900 }}>
      <Header title="Admin Console" />
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAdminData} tintColor="#F59E0B" />}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Landmark size={28} color="#F59E0B" />
              <Text style={styles.title}>Admin Console</Text>
            </View>
            <Text style={styles.subtitle}>Configure global parameters, manage credentials, and audit telemetry metrics.</Text>
          </View>
          <TouchableOpacity onPress={() => fetchAdminData()} disabled={refreshing} style={styles.iconBtn}>
            <RefreshCw size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]} 
            onPress={() => navigation.navigate('AdminLiveMap')}
          >
            <Text style={[styles.actionBtnText, { color: '#0F172A' }]}>Live Activity Map</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]} 
            onPress={() => navigation.navigate('AdminDonations')}
          >
            <Text style={styles.actionBtnText}>Audit Registry</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
        <View style={styles.statsRow}>
          {numericStats.map((stat, idx) => (
            <View key={idx} style={styles.statCardContainer}>
              <View style={styles.glassPanel}>
                <View style={[styles.statIconWrapper, { backgroundColor: stat.bg }]}>
                  <stat.Icon size={20} color={stat.color} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
        <View style={styles.aiBanner}>
          <View style={styles.aiBannerLeft}>
            <View style={styles.aiIconBox}>
              <Sparkles size={20} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.aiBannerTitle}>AI System Health</Text>
              <Text style={styles.aiBannerSub}>Ollama local microservices</Text>
            </View>
          </View>
          
          <View style={styles.aiBannerDetails}>
            <Text style={styles.aiBannerText}>Provider: <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Ollama</Text></Text>
            <Text style={styles.aiBannerText}>Model: <Text style={{ color: '#FFF', fontWeight: 'bold' }}>qwen3:1.7b</Text></Text>
            <View style={styles.aiBannerStatusBox}>
              <Text style={styles.aiBannerText}>Status: </Text>
              <View style={[styles.aiStatusBadge, aiStatus === 'Connected' ? styles.aiBadgeConnected : styles.aiBadgeDisc]}>
                <Text style={[styles.aiStatusText, aiStatus === 'Connected' ? styles.aiTextConnected : styles.aiTextDisc]}>{aiStatus}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.mainGrid}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Approvals Queue</Text>
        </View>

        <View style={styles.queueContainer}>
          <Text style={styles.queueTitle}>Pending NGOs ({pendingNgosList.length})</Text>
          {pendingNgosList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No pending NGO applications.</Text>
            </View>
          ) : (
            pendingNgosList.map(ngo => (
              <View key={ngo._id} style={styles.queueCard}>
                <Text style={styles.cardTitle}>{ngo.name}</Text>
                <Text style={styles.cardInfo}>Email: <Text style={{color: COLORS.white, fontWeight: 'bold'}}>{ngo.email}</Text></Text>
                <Text style={styles.cardInfo}>Phone: <Text style={{color: COLORS.white, fontWeight: 'bold'}}>{ngo.phoneNumber || 'N/A'}</Text></Text>
                {ngo.businessRegistrationNumber && <Text style={styles.cardInfo}>Reg No: <Text style={{color: COLORS.white, fontWeight: 'bold'}}>{ngo.businessRegistrationNumber}</Text></Text>}
                <Text style={styles.cardInfo}>Address: <Text style={{color: COLORS.white, fontWeight: 'bold'}}>{ngo.address || 'N/A'}</Text></Text>
                
                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={() => handleApproveUser(ngo._id, 'approve')} style={[styles.halfBtn, { backgroundColor: '#10B981' }]}>
                    <CheckCircle2 size={14} color="#0F172A" style={{marginRight: 6}} />
                    <Text style={styles.halfBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleApproveUser(ngo._id, 'reject')} style={[styles.halfBtn, { backgroundColor: '#EF4444' }]}>
                    <XCircle size={14} color="#FFFFFF" style={{marginRight: 6}} />
                    <Text style={[styles.halfBtnText, {color: COLORS.white}]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.queueTitle, { marginTop: 24 }]}>Pending Volunteers ({pendingVolunteersList.length})</Text>
          {pendingVolunteersList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No pending Volunteer applications.</Text>
            </View>
          ) : (
            pendingVolunteersList.map(vol => (
              <View key={vol._id} style={styles.queueCard}>
                <Text style={styles.cardTitle}>{vol.name}</Text>
                <Text style={styles.cardInfo}>Email: <Text style={{color: COLORS.white, fontWeight: 'bold'}}>{vol.email}</Text></Text>
                <Text style={styles.cardInfo}>Phone: <Text style={{color: COLORS.white, fontWeight: 'bold'}}>{vol.phoneNumber || 'N/A'}</Text></Text>
                <Text style={styles.cardInfo}>Address: <Text style={{color: COLORS.white, fontWeight: 'bold'}}>{vol.address || 'N/A'}</Text></Text>
                
                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={() => handleApproveUser(vol._id, 'approve')} style={[styles.halfBtn, { backgroundColor: '#10B981' }]}>
                    <CheckCircle2 size={14} color="#0F172A" style={{marginRight: 6}} />
                    <Text style={styles.halfBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleApproveUser(vol._id, 'reject')} style={[styles.halfBtn, { backgroundColor: '#EF4444' }]}>
                    <XCircle size={14} color="#FFFFFF" style={{marginRight: 6}} />
                    <Text style={[styles.halfBtnText, {color: COLORS.white}]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Surplus Account Controller</Text>
        </View>

        <View style={styles.usersList}>
          {users.map(item => (
            <View key={item._id} style={styles.userCard}>
              <View style={styles.userTopRow}>
                <Text style={styles.userName}>{item.name}</Text>
                <View style={[styles.roleBadge, 
                  item.role === 'ADMIN' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' } :
                  item.role === 'NGO' ? { backgroundColor: 'rgba(34, 211, 238, 0.1)', borderColor: 'rgba(34, 211, 238, 0.2)' } :
                  { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }
                ]}>
                  <Text style={[styles.roleText, 
                    item.role === 'ADMIN' ? { color: '#F59E0B' } :
                    item.role === 'NGO' ? { color: '#22D3EE' } :
                    { color: '#10B981' }
                  ]}>{item.role}</Text>
                </View>
              </View>
              
              <Text style={styles.cardInfo}>{item.email}</Text>
              <Text style={styles.cardInfo}>Trust Score: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{item.trustScore || 85}%</Text></Text>
              <Text style={styles.cardInfo}>Verification: <Text style={{color: COLORS.white, fontWeight: 'bold'}}>{(item.approvalStatus || 'approved').toUpperCase()}</Text></Text>

              <View style={styles.actionGrid}>
                {item.role !== 'ADMIN' && (
                  <>
                    <TouchableOpacity onPress={() => handleMakeAdmin(item._id)} style={styles.adminActionBtn}>
                      <Text style={styles.adminActionText}>Make Admin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleToggleBlock(item._id)} 
                      style={[styles.adminActionBtn, item.isBlocked ? styles.btnEmerald : styles.btnYellow]}
                    >
                      {item.isBlocked ? <Unlock size={12} color="#10B981" style={{marginRight: 4}} /> : <Lock size={12} color="#F59E0B" style={{marginRight: 4}} />}
                      <Text style={item.isBlocked ? styles.textEmerald : styles.textYellow}>{item.isBlocked ? 'Unblock' : 'Block'}</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => handleDeleteUser(item._id)} style={[styles.adminActionBtn, styles.btnRed]}>
                  <Trash2 size={12} color="#EF4444" style={{marginRight: 4}} />
                  <Text style={styles.textRed}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
  statsScroll: {
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 32,
  },
  statCardContainer: {
    width: 140,
    paddingHorizontal: 6,
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
    textAlign: 'center',
  },
  statValue: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  aiBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  aiIconBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginRight: 12,
  },
  aiBannerTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiBannerSub: {
    color: COLORS.slate400,
    fontSize: 10,
    marginTop: 2,
  },
  aiBannerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBannerText: {
    color: COLORS.slate400,
    fontSize: 10,
  },
  aiBannerStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiStatusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  aiBadgeConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  aiBadgeDisc: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  aiStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  aiTextConnected: { color: '#10B981' },
  aiTextDisc: { color: COLORS.red400 },
  mainGrid: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  queueContainer: {
    marginBottom: 24,
  },
  queueTitle: {
    color: COLORS.slate500,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.slate500,
    fontSize: 12,
  },
  queueCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardInfo: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  halfBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  halfBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  usersList: {
    marginBottom: 24,
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
  },
  userTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  adminActionBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminActionText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  btnEmerald: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  btnYellow: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
  btnRed: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  textEmerald: { color: '#10B981', fontSize: 10, fontWeight: 'bold' },
  textYellow: { color: '#F59E0B', fontSize: 10, fontWeight: 'bold' },
  textRed: { color: COLORS.red400, fontSize: 10, fontWeight: 'bold' },
});
