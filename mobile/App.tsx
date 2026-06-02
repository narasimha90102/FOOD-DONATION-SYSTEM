import React from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from './src/store/useAppStore';

// Screen imports
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DonorDashboard from './src/screens/DonorDashboard';
import NgoDashboard from './src/screens/NgoDashboard';
import ChatScreen from './src/screens/ChatScreen';
import MapScreen from './src/screens/MapScreen';

export default function App() {
  const { currentScreen } = useAppStore();

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'LOGIN':
      case 'LANDING':
        return <LoginScreen />;
      case 'REGISTER':
        return <RegisterScreen />;
      case 'DONOR_DASHBOARD':
        return <DonorDashboard />;
      case 'NGO_DASHBOARD':
        return <NgoDashboard />;
      case 'CHAT':
        return <ChatScreen />;
      case 'MAP':
        return <MapScreen />;
      default:
        return <LoginScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {renderActiveScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
});
