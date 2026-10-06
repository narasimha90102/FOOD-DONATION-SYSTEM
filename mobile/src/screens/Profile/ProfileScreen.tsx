import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
import { User, Phone, MapPin, Save, ShieldAlert, Award, Sparkles, Flame, CheckCircle, AlertCircle } from 'lucide-react-native';
import { COLORS } from '../../theme/colors';

export const ProfileScreen = () => {
  const { user, refreshUser, logout } = useAuth();
  
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [volAvailability, setVolAvailability] = useState<'AVAILABLE' | 'BUSY' | 'OFFLINE'>('AVAILABLE');
  
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhoneNumber(user.phone || '');
      setAddress(user.address || '');
      if ((user as any).volunteerAvailability) {
        setVolAvailability((user as any).volunteerAvailability);
      }
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!name) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
      };
      
      if (user?.role === 'VOLUNTEER') {
        payload.volunteerAvailability = volAvailability;
      }

      const res = await authApi.updateProfile(payload);
      if (res.success) {
        await refreshUser();
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', res.message || 'Failed to update profile');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred while updating profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Danger Zone — Delete Account',
      'Are you sure you want to PERMANENTLY delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              const res = await authApi.deleteAccount();
              if (res.success) {
                Alert.alert('Account Deleted', 'Your account has been deleted.');
                await logout();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete account.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'An error occurred during account deletion.');
            } finally {
              setDeleteLoading(false);
            }
          }
        }
      ]
    );
  };

  const roleLabels: any = {
    ADMIN: 'System Administrator',
    NGO: 'Registered NGO Partner',
    DONOR: 'Food Surplus Donor',
    VOLUNTEER: 'Registered Volunteer Partner',
  };

  return (
    <View style={styles.container}>
      <Header title="Account Profile" showBack={true} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageSubtitle}>
            Configure your personal profile details, contact information, and account settings.
          </Text>
        </View>

        <View style={styles.topCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase() || 'U'}</Text>
            </View>
            <View style={styles.avatarBadge}>
              <Sparkles size={12} color="#0F172A" />
            </View>
          </View>
          
          <Text style={styles.userName}>{name || user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleLabels[user?.role || 'DONOR'] || user?.role}</Text>
          </View>

          <View style={styles.trustBox}>
            <View style={styles.trustHeader}>
              <Text style={styles.trustLabel}>Trust Score</Text>
              <Text style={styles.trustValue}>{(user as any)?.trustScore || 85}%</Text>
            </View>
            <View style={styles.trustBarBg}>
              <View style={[styles.trustBarFill, { width: `${(user as any)?.trustScore || 85}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Update Profile Information</Text>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <User size={14} color="#10B981" />
              <Text style={styles.inputLabel}>FULL NAME</Text>
            </View>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Phone size={14} color="#10B981" />
              <Text style={styles.inputLabel}>PHONE NUMBER</Text>
            </View>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter contact number"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MapPin size={14} color="#10B981" />
              <Text style={styles.inputLabel}>PHYSICAL ADDRESS</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter street, city details"
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {user?.role === 'VOLUNTEER' && (
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Sparkles size={14} color="#10B981" />
                <Text style={styles.inputLabel}>AVAILABILITY STATUS</Text>
              </View>
              <View style={styles.chipRow}>
                {['AVAILABLE', 'BUSY', 'OFFLINE'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.chip, volAvailability === status && styles.chipActive]}
                    onPress={() => setVolAvailability(status as any)}
                  >
                    <Text style={[styles.chipText, volAvailability === status && styles.chipTextActive]}>
                      {status === 'AVAILABLE' ? '🟢 Available' : status === 'BUSY' ? '🟡 Busy' : '⚫ Offline'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" size="small" />
            ) : (
              <>
                <Save size={18} color="#0F172A" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Danger Zone — Delete Account</Text>
          <Text style={styles.dangerText}>
            Permanently erases your credentials and associated data. This action cannot be undone.
          </Text>
          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={handleDeleteAccount}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <ActivityIndicator color="#F87171" size="small" />
            ) : (
              <>
                <ShieldAlert size={16} color="#F87171" />
                <Text style={styles.deleteBtnText}>Delete Account Permanently</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
      <BottomNavbar activeTab="profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark900,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  pageHeader: {
    marginBottom: 20,
  },
  pageSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  topCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E293B',
    borderWidth: 4,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: '#10B981',
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.dark900,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 12,
  },
  roleText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trustBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
  },
  trustHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trustValue: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
  },
  trustBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trustBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  chipText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  chipTextActive: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dangerCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 16,
    padding: 20,
  },
  dangerTitle: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dangerText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  deleteBtnText: {
    color: '#F87171',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
