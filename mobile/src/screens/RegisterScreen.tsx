import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { InputWithIcon } from '../components/InputWithIcon';
import { User, Mail, Key, Building, Compass } from 'lucide-react';

export default function RegisterScreen() {
  const { navigate } = useAppStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'DONOR' | 'NGO'>('DONOR');
  
  // NGO custom properties
  const [address, setAddress] = useState('');
  const [businessReg, setBusinessReg] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError('Please provide all primary fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload: any = {
        name,
        email,
        password,
        role,
        address: role === 'NGO' ? address : '',
        businessRegistrationNumber: role === 'NGO' ? businessReg : '',
        coordinates: [77.5946, 12.9716], // Default BGL
      };

      await MobileApiService.post('/auth/register', payload);

      setSuccess('Registry initialized successfully! Verification token dispatched.');
      setTimeout(() => {
        navigate('LOGIN');
      }, 1500);

    } catch (e: any) {
      setError(e.message || 'Registry failed. Try audit detail inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Initialize Profile</Text>
        <Text style={styles.subtitle}>Join the zero-waste redistribution network</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {success ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      {/* Role selector */}
      <View style={styles.roleContainer}>
        <TouchableOpacity
          onPress={() => setRole('DONOR')}
          style={[styles.roleTab, role === 'DONOR' ? styles.roleTabActive : null]}
        >
          <Text style={[styles.roleTabText, role === 'DONOR' ? styles.roleTabTextActive : null]}>Donor</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setRole('NGO')}
          style={[styles.roleTab, role === 'NGO' ? styles.roleTabActive : null]}
        >
          <Text style={[styles.roleTabText, role === 'NGO' ? styles.roleTabTextActive : null]}>NGO</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <InputWithIcon
          icon={User}
          placeholder="Account / Hub Name"
          value={name}
          onChangeText={setName}
          disabled={loading}
        />

        <InputWithIcon
          icon={Mail}
          placeholder="Registry Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          disabled={loading}
        />

        <InputWithIcon
          icon={Key}
          placeholder="Security Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          disabled={loading}
        />

        {role === 'NGO' ? (
          <View style={styles.ngoSection}>
            <InputWithIcon
              icon={Building}
              placeholder="Business Registration Number"
              value={businessReg}
              onChangeText={setBusinessReg}
              disabled={loading}
            />

            <InputWithIcon
              icon={Compass}
              placeholder="Legal Address"
              value={address}
              onChangeText={setAddress}
              disabled={loading}
            />
          </View>
        ) : null}

        <TouchableOpacity onPress={handleSignup} disabled={loading} style={styles.btnPrimary}>
          {loading ? (
            <ActivityIndicator color="#030712" />
          ) : (
            <Text style={styles.btnText}>Register Surplus Account</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => navigate('LOGIN')} style={styles.linkButton}>
        <Text style={styles.linkText}>Have account? Sign in here</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#030712',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    color: '#10b981',
    fontSize: 12,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    padding: 4,
    borderRadius: 8,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  roleTabActive: {
    backgroundColor: '#10b981',
  },
  roleTabText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 12,
  },
  roleTabTextActive: {
    color: '#030712',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  ngoSection: {
    gap: 16,
  },
  ngoInput: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnText: {
    color: '#030712',
    fontWeight: 'bold',
    fontSize: 14,
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
