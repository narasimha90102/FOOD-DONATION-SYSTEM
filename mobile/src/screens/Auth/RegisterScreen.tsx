import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { PasswordInput } from '../../components/PasswordInput';
import { Button } from '../../components/Button';
import Geolocation from '@react-native-community/geolocation';
import { COLORS } from '../../theme/colors';

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'DONOR' | 'NGO' | 'VOLUNTEER'>('DONOR');
  
  // Conditional fields matching web
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Geolocation state
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      
      Geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => console.log('Location error:', error),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    };

    fetchLocation();
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all primary fields.');
      return;
    }
    try {
      setLoading(true);
      const res = await register({
        name,
        email,
        password,
        role: role as any, // Cast for the api payload which used lowercase originally, though backend accepts uppercase now
        ...(role !== 'DONOR' ? { phoneNumber: phone, address } : {}),
      });
      if (res && res.code === 'ACCOUNT_PENDING_APPROVAL') {
        Alert.alert('Registration Successful', res.message);
        navigation.navigate('Login');
      }
    } catch (err: any) {
      console.log("========== REGISTRATION DEBUG ==========");
      console.log("METHOD:", err?.config?.method);
      console.log("BASE URL:", err?.config?.baseURL);
      console.log("REQUEST URL:", err?.config?.url);
      console.log("STATUS:", err?.response?.status);
      console.log("RESPONSE:", err?.response?.data);
      console.log("=========================================");
      const backendMessage = err.response?.data?.message || err.message || 'Unable to create account';
      Alert.alert('Registration Failed', backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerGroup}>
          <Text style={styles.brandTitle}>FoodBridge AI</Text>
          <Text style={styles.heading}>Create Surplus Account</Text>
          <Text style={styles.subheading}>Become part of the zero-waste network</Text>
        </View>

        <View style={styles.roleContainer}>
          {(['DONOR', 'NGO', 'VOLUNTEER'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleChip, role === r ? styles.roleChipActive : null]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleChipText, role === r ? styles.roleChipTextActive : null]}>
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input 
          label={role === 'VOLUNTEER' ? 'Name' : 'Surplus Name / Organization'} 
          placeholder={role === 'VOLUNTEER' ? 'e.g. John Doe' : 'e.g. Spice Grill Cafe'} 
          value={name} 
          onChangeText={setName} 
        />
        <Input 
          label="Email Coordinates" 
          placeholder="example@mail.com" 
          keyboardType="email-address" 
          autoCapitalize="none" 
          value={email} 
          onChangeText={setEmail} 
        />
        <PasswordInput 
          label="Secure Password" 
          placeholder="Min 6 characters" 
          value={password} 
          onChangeText={setPassword} 
        />

        {role === 'NGO' && (
          <View style={styles.conditionalGroup}>
            <Text style={styles.conditionalTitle}>ORGANIZATION CREDENTIALS</Text>
            <Input label="Contact Phone" placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Input label="Address" placeholder="e.g. 5th Cross, Tech Hub" value={address} onChangeText={setAddress} />
          </View>
        )}

        {role === 'VOLUNTEER' && (
          <View style={styles.conditionalGroup}>
            <Text style={styles.conditionalTitle}>VOLUNTEER DETAILS</Text>
            <Input label="Phone Number" placeholder="e.g. +91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Input label="Residential Address" placeholder="e.g. 5th Cross Road, Bangalore" value={address} onChangeText={setAddress} />
          </View>
        )}

        <Button title="Sign Up Account" onPress={handleRegister} loading={loading} style={styles.btn} />

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
          <Text style={styles.linkText}>
            Already coordinate surpluses with us? <Text style={styles.linkHighlight}>Login Here</Text>
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
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate800,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    marginBottom: 24,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  roleChipText: {
    color: COLORS.slate400,
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleChipTextActive: {
    color: COLORS.dark900,
  },
  conditionalGroup: {
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    paddingTop: 16,
    marginTop: 8,
  },
  conditionalTitle: {
    color: COLORS.brand,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
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
});
