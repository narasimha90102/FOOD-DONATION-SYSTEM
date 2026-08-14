import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showLogout?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showLogout = true }) => {
  const { user, logout } = useAuth();

  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.brandTitle}>FoodBridge AI</Text>
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {showLogout && user ? (
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleContainer: {
    flex: 1,
  },
  brandTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
