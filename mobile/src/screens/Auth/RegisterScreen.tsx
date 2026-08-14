import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'donor' | 'ngo' | 'volunteer' | 'admin'>('donor');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in required fields (Name, Email, Password)');
      return;
    }
    try {
      setLoading(true);
      await register({ name, email, password, role, phone, organization });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brandTitle}>FoodBridge AI</Text>
        <Text style={styles.heading}>Create New Account</Text>
        <Text style={styles.subheading}>Join the Food Donation Network</Text>

        <Input label="Full Name *" placeholder="John Doe" value={name} onChangeText={setName} />
        <Input label="Email Address *" placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Input label="Password *" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="Phone Number" placeholder="+1 234 567 8900" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input label="Organization / NGO Name" placeholder="Hope Foundation" value={organization} onChangeText={setOrganization} />

        <Text style={styles.roleLabel}>Select Account Role *</Text>
        <View style={styles.roleContainer}>
          {(['donor', 'ngo', 'volunteer', 'admin'] as const).map((r) => (
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

        <Button title="Complete Registration" onPress={handleRegister} loading={loading} style={styles.btn} />

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkHighlight}>Sign in</Text>
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
    marginBottom: 16,
  },
  roleLabel: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  roleChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  roleChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  btn: {
    marginTop: 8,
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
