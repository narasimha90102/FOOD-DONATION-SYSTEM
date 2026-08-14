import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Header title="My Profile" subtitle="Account details & role privileges" />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>ROLE: {user?.role?.toUpperCase()}</Text>
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <Text style={styles.label}>Email Address</Text>
          <Text style={styles.value}>{user?.email}</Text>

          <Text style={styles.label}>Phone Number</Text>
          <Text style={styles.value}>{user?.phone || 'Not provided'}</Text>

          <Text style={styles.label}>Organization / Entity</Text>
          <Text style={styles.value}>{user?.organization || 'Individual Donor / Volunteer'}</Text>

          <Text style={styles.label}>Account Verification</Text>
          <Text style={[styles.value, { color: user?.isVerified ? '#10B981' : '#F59E0B' }]}>
            {user?.isVerified ? '✓ Verified Account' : 'Pending Verification'}
          </Text>
        </Card>

        <Button title="Sign Out of Mobile App" variant="danger" onPress={logout} style={styles.logoutBtn} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  label: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  value: {
    color: '#CBD5E1',
    fontSize: 15,
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: 8,
    marginBottom: 32,
  },
});
