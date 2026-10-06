import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { PasswordInput } from '../../components/PasswordInput';
import { Button } from '../../components/Button';
import { COLORS } from '../../theme/colors';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      setLoading(true);
      await login({ email, password });
    } catch (err: any) {
      console.log("===== FOODBRIDGE LOGIN ERROR =====");
      console.log("STATUS:", err?.response?.status);
      console.log("REQUEST URL:", err?.config?.url);
      console.log("BASE URL:", err?.config?.baseURL);
      console.log("RESPONSE:", err?.response?.data);
      console.log("=================================");
      const backendMessage = err.response?.data?.message || err.message || 'Unable to authenticate with backend server';
      Alert.alert('Login Failed', `${backendMessage}\n\nTip: Ensure your phone and PC are connected to USB with ADB Reverse, or on the same Wi-Fi.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerGroup}>
          <Text style={styles.brandTitle}>FoodBridge AI</Text>
          <Text style={styles.heading}>Sign in to your account</Text>
          <Text style={styles.subheading}>Enterprise Food Donation Platform</Text>
        </View>

        <Input
          label="Email Address"
          placeholder="donor@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <PasswordInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
        />

        <Button title="Secure Sign In" onPress={handleLogin} loading={loading} style={styles.btn} />

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkContainer}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkHighlight}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.dark900,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.glassBg,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerGroup: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandTitle: {
    color: COLORS.brand,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heading: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subheading: {
    color: COLORS.slate400,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  btn: {
    marginTop: 24,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  linkContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.slate400,
    fontSize: 14,
  },
  linkHighlight: {
    color: COLORS.brand,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  serverPill: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  serverText: {
    color: COLORS.slate400,
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.dark800,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: COLORS.slate400,
    fontSize: 13,
    marginBottom: 16,
  },
  sectionLabel: {
    color: COLORS.slate300,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  candidateRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  candidateRowActive: {
    borderColor: COLORS.brand,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  candidateText: {
    color: COLORS.slate300,
    fontSize: 13,
  },
  candidateTextActive: {
    color: COLORS.brand,
    fontWeight: 'bold',
  },
  customInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  applyBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  applyBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  closeBtnText: {
    color: COLORS.slate300,
    fontWeight: '600',
    fontSize: 13,
  },
});

