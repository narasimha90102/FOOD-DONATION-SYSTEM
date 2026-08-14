import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { adminApi } from '../../api/admin';

export const AdminDashboardScreen = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminData = async () => {
    try {
      setRefreshing(true);
      const [uRes, aRes] = await Promise.all([
        adminApi.getUsers().catch(() => ({ success: false, users: [] })),
        adminApi.getAnalytics().catch(() => ({ success: false, analytics: null })),
      ]);

      if (uRes.success && Array.isArray(uRes.users)) {
        setUsers(uRes.users);
      }
      if (aRes.success) {
        setAnalytics(aRes.analytics);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleVerify = async (userId: string, currentVerified: boolean) => {
    try {
      await adminApi.verifyUser(userId, !currentVerified);
      Alert.alert('Success', `User verification updated to ${!currentVerified}`);
      fetchAdminData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update user verification');
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Admin Portal" subtitle="System metrics, user verifications & platform governance" />

      <View style={styles.content}>
        {analytics ? (
          <Card style={styles.analyticsCard}>
            <Text style={styles.analyticsTitle}>Platform Summary</Text>
            <Text style={styles.analyticsStat}>Total Users: {analytics.totalUsers || users.length}</Text>
            <Text style={styles.analyticsStat}>Active Donations: {analytics.totalDonations || 0}</Text>
            <Text style={styles.analyticsStat}>Meal Impact Count: {analytics.totalServings || 0}</Text>
          </Card>
        ) : null}

        <Text style={styles.sectionHeader}>Registered Platform Users ({users.length})</Text>

        <FlatList
          data={users}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchAdminData} tintColor="#10B981" />}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.userRow}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userRole}>{item.role?.toUpperCase()}</Text>
              </View>
              <Text style={styles.userEmail}>{item.email}</Text>
              {item.organization ? <Text style={styles.userOrg}>Org: {item.organization}</Text> : null}

              <Button
                title={item.isVerified ? 'Revoke Verification' : 'Verify Account'}
                variant={item.isVerified ? 'danger' : 'primary'}
                onPress={() => handleVerify(item._id, !!item.isVerified)}
                style={styles.verifyBtn}
              />
            </Card>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  analyticsCard: {
    backgroundColor: '#0F172A',
    marginBottom: 16,
  },
  analyticsTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  analyticsStat: {
    color: '#CBD5E1',
    fontSize: 14,
    marginVertical: 2,
  },
  sectionHeader: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  userOrg: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  verifyBtn: {
    marginTop: 10,
    paddingVertical: 8,
  },
});
