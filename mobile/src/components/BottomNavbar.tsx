import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  PlusCircle, 
  User, 
  Map, 
  Compass, 
  Landmark,
  Bot,
  Sparkles
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';

interface BottomNavbarProps {
  activeTab?: 'home' | 'action' | 'food-ai' | 'profile' | 'chat' | 'notifications';
}

export const BottomNavbar: React.FC<BottomNavbarProps> = ({ activeTab }) => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAuth();

  const role = user?.role?.toUpperCase() || 'DONOR';

  const getHomeRoute = () => {
    switch (role) {
      case 'NGO': return 'NgoDashboard';
      case 'VOLUNTEER': return 'VolunteerDashboard';
      case 'ADMIN': return 'AdminDashboard';
      case 'DONOR':
      default: return 'DonorDashboard';
    }
  };

  const getActionConfig = () => {
    switch (role) {
      case 'DONOR':
        return {
          label: 'Donate',
          icon: PlusCircle,
          route: 'CreateDonation',
          isHighlight: true,
        };
      case 'NGO':
        return {
          label: 'Browse Radar',
          icon: Compass,
          route: 'NgoDashboard',
          isHighlight: false,
        };
      case 'VOLUNTEER':
        return {
          label: 'Pickups',
          icon: Map,
          route: 'VolunteerDashboard',
          isHighlight: false,
        };
      case 'ADMIN':
        return {
          label: 'Live Map',
          icon: Map,
          route: 'AdminLiveMap',
          isHighlight: false,
        };
      default:
        return {
          label: 'Donate',
          icon: PlusCircle,
          route: 'CreateDonation',
          isHighlight: true,
        };
    }
  };

  const action = getActionConfig();

  const isHomeActive = activeTab === 'home' || route.name === getHomeRoute();
  const isActionActive = activeTab === 'action' || route.name === action.route;
  const isFoodAIActive = activeTab === 'food-ai' || route.name === 'FoodAI';
  const isProfileActive = activeTab === 'profile' || route.name === 'Profile';

  return (
    <View style={styles.container}>
      {/* 1. Home Tab */}
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => navigation.navigate(getHomeRoute())}
        activeOpacity={0.7}
      >
        <Home 
          size={22} 
          color={isHomeActive ? '#10B981' : COLORS.slate400} 
        />
        <Text style={[styles.tabText, isHomeActive && styles.activeTabText]}>
          Home
        </Text>
      </TouchableOpacity>

      {/* 2. Role Action Tab (Donate / Browse / Pickups / Live Map) */}
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => navigation.navigate(action.route)}
        activeOpacity={0.7}
      >
        {action.isHighlight ? (
          <View style={[styles.highlightBtn, isActionActive && styles.highlightBtnActive]}>
            <action.icon size={22} color={isActionActive ? '#0F172A' : '#0F172A'} />
          </View>
        ) : (
          <action.icon 
            size={22} 
            color={isActionActive ? '#10B981' : COLORS.slate400} 
          />
        )}
        <Text style={[styles.tabText, isActionActive && styles.activeTabText]}>
          {action.label}
        </Text>
      </TouchableOpacity>

      {/* 3. FOOD AI Tab */}
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => navigation.navigate('FoodAI')}
        activeOpacity={0.7}
      >
        <View style={[styles.aiIconWrapper, isFoodAIActive && styles.aiIconWrapperActive]}>
          <Bot 
            size={20} 
            color={isFoodAIActive ? '#10B981' : COLORS.slate400} 
          />
        </View>
        <Text style={[styles.tabText, isFoodAIActive && styles.activeTabText]}>
          FOOD AI
        </Text>
      </TouchableOpacity>

      {/* 4. Profile Tab */}
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.7}
      >
        <User 
          size={22} 
          color={isProfileActive ? '#10B981' : COLORS.slate400} 
        />
        <Text style={[styles.tabText, isProfileActive && styles.activeTabText]}>
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'ios' ? 76 : 64,
    paddingBottom: Platform.OS === 'ios' ? 16 : 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0B132B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate400,
    marginTop: 3,
  },
  activeTabText: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  highlightBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  highlightBtnActive: {
    backgroundColor: '#34D399',
    shadowOpacity: 0.7,
  },
  aiIconWrapper: {
    padding: 2,
  },
  aiIconWrapperActive: {
    transform: [{ scale: 1.1 }],
  },
});
