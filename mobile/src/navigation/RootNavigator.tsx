import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from './navigationRef';
import { ROLES } from '../constants/roles';

// Auth Screens
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';

// Donor Screens
import { DonorDashboardScreen } from '../screens/Donor/DonorDashboardScreen';
import { CreateDonationScreen } from '../screens/Donor/CreateDonationScreen';

// NGO Screens
import { NgoDashboardScreen } from '../screens/NGO/NgoDashboardScreen';

// Volunteer Screens
import { VolunteerDashboardScreen } from '../screens/Volunteer/VolunteerDashboardScreen';

// Admin Screens
import { AdminDashboardScreen } from '../screens/Admin/AdminDashboardScreen';
import { AdminLiveMapScreen } from '../screens/Admin/AdminLiveMapScreen';
import { AdminDonationsScreen } from '../screens/Admin/AdminDonationsScreen';

// Shared Screens
import { ChatScreen } from '../screens/Chat/ChatScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { FoodAIScreen } from '../screens/FoodAI/FoodAIScreen';

const Stack = createNativeStackNavigator();

/**
 * Loading splash — shown while AuthContext re-validates the stored token
 * against the backend. This prevents any flash of wrong dashboard.
 */
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#10B981" />
  </View>
);

export const RootNavigator = () => {
  const { user, loading } = useAuth();

  // ── Phase 1: Token validation in progress ────────────────────────────────
  // Show blank loading screen while AuthContext fetches /auth/me.
  // This prevents ANY dashboard from rendering before role is confirmed.
  if (loading) {
    return <LoadingScreen />;
  }

  // ── Phase 2: Determine role ───────────────────────────────────────────────
  // Role is always canonical UPPERCASE from AuthContext (normalized on login)
  const role = user?.role?.toUpperCase();

  const getInitialRoute = (): string => {
    switch (role) {
      case ROLES.NGO:       return 'NgoDashboard';
      case ROLES.VOLUNTEER: return 'VolunteerDashboard';
      case ROLES.ADMIN:     return 'AdminDashboard';
      case ROLES.DONOR:
      default:              return 'DonorDashboard';
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        initialRouteName={user ? getInitialRoute() : 'Login'}
      >
        {!user ? (
          // ── UNAUTHENTICATED: Only login/register accessible ──────────────
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // ── AUTHENTICATED: Only role-appropriate screens are registered ──
          // A DONOR cannot navigate to NgoDashboard because that screen
          // is simply NOT in their navigator. Navigation.navigate() would throw.
          <>
            {/* DONOR — Only donor screens */}
            {role === ROLES.DONOR && (
              <>
                <Stack.Screen name="DonorDashboard" component={DonorDashboardScreen} />
                <Stack.Screen name="CreateDonation" component={CreateDonationScreen} />
                <Stack.Screen name="Donate" component={CreateDonationScreen} />
              </>
            )}

            {/* NGO — Only NGO screens */}
            {role === ROLES.NGO && (
              <>
                <Stack.Screen name="NgoDashboard" component={NgoDashboardScreen} />
              </>
            )}

            {/* VOLUNTEER — Only volunteer screens */}
            {role === ROLES.VOLUNTEER && (
              <>
                <Stack.Screen name="VolunteerDashboard" component={VolunteerDashboardScreen} />
              </>
            )}

            {/* ADMIN — Admin screens */}
            {role === ROLES.ADMIN && (
              <>
                <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
                <Stack.Screen name="AdminLiveMap" component={AdminLiveMapScreen} />
                <Stack.Screen name="AdminDonations" component={AdminDonationsScreen} />
              </>
            )}

            {/* SHARED — Available to ALL authenticated roles */}
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="FoodAI" component={FoodAIScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
