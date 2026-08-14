import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Screens
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';
import { DonorDashboardScreen } from '../screens/Donor/DonorDashboardScreen';
import { CreateDonationScreen } from '../screens/Donor/CreateDonationScreen';
import { NgoDashboardScreen } from '../screens/NGO/NgoDashboardScreen';
import { VolunteerDashboardScreen } from '../screens/Volunteer/VolunteerDashboardScreen';
import { AdminDashboardScreen } from '../screens/Admin/AdminDashboardScreen';
import { ChatScreen } from '../screens/Chat/ChatScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const getRoleInitialScreen = () => {
    switch (user?.role) {
      case 'ngo':
        return 'NgoDashboard';
      case 'volunteer':
        return 'VolunteerDashboard';
      case 'admin':
        return 'AdminDashboard';
      case 'donor':
      default:
        return 'DonorDashboard';
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainDashboard" component={
              user.role === 'ngo'
                ? NgoDashboardScreen
                : user.role === 'volunteer'
                ? VolunteerDashboardScreen
                : user.role === 'admin'
                ? AdminDashboardScreen
                : DonorDashboardScreen
            } />
            <Stack.Screen name="DonorDashboard" component={DonorDashboardScreen} />
            <Stack.Screen name="CreateDonation" component={CreateDonationScreen} />
            <Stack.Screen name="NgoDashboard" component={NgoDashboardScreen} />
            <Stack.Screen name="VolunteerDashboard" component={VolunteerDashboardScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
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
