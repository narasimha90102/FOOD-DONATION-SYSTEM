import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

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
      Alert.alert('Login Failed', err.message || 'Unable to authenticate with backend server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brandTitle}>FoodBridge AI</Text>
        <Text style={styles.heading}>Sign in to your account</Text>
        <Text style={styles.subheading}>Enterprise Food Donation Platform</Text>

        <Input
          label="Email Address"
          placeholder="donor@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.btn} />

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkContainer}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkHighlight}>Register here</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  brandTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subheading: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 20,
  },
  btn: {
    marginTop: 12,
  },
  linkContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#10B981',
    fontWeight: 'bold',
  },
});
