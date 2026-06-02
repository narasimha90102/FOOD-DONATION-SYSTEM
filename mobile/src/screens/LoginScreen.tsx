import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { MobileApiService } from '../services/api';
import { InputWithIcon } from '../components/InputWithIcon';
import { Key, Mail, Heart } from 'lucide-react';

export default function LoginScreen() {
  const { login, navigate } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await MobileApiService.post('/auth/login', { email, password });
      login(data.token, data.user);
    } catch (e: any) {
      setError(e.message || 'Verification rejected. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMock = async () => {
    setLoading(true);
    setError('');
    try {
      const googleMockPayload = {
        email: email || 'mobile.donor@gmail.com',
        name: 'Google Mobile Donor',
        googleIdToken: 'mobile-oauth-token-' + Date.now(),
        profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
        role: 'DONOR'
      };
      const data = await MobileApiService.post('/auth/google', googleMockPayload);
      login(data.token, data.user);
    } catch (e: any) {
      setError('Google Sign-in connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Heart size={32} color="#10b981" fill="rgba(16, 185, 129, 0.2)" />
        </View>
        <Text style={styles.title}>FoodBridge AI</Text>
        <Text style={styles.subtitle}>Mobile Surplus Redistribution Network</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <InputWithIcon
          icon={Mail}
          placeholder="Email Address"
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

        <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.btnPrimary}>
          {loading ? (
            <ActivityIndicator color="#030712" />
          ) : (
            <Text style={styles.btnText}>Sign In Session</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity onPress={handleGoogleMock} style={styles.btnGoogle}>
        <Text style={styles.btnGoogleText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigate('REGISTER')} style={styles.linkButton}>
        <Text style={styles.linkText}>Create Surplus Account</Text>
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
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  btnGoogle: {
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  btnGoogleText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
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
