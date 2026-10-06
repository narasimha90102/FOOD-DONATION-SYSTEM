import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { SocketService } from '../services/socketService';
import { 
  Heart, 
  Bell, 
  Menu, 
  MoreVertical, 
  User, 
  LogOut, 
  Package, 
  Map, 
  FileText, 
  CheckSquare, 
  MessageSquare, 
  ArrowLeft,
  Compass,
  Award,
  Landmark,
  X,
  History
} from 'lucide-react-native';
import { COLORS } from '../theme/colors';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications');
      const list = res.data.notifications || res.data || [];
      const unread = list.filter((n: any) => !n.isRead && !n.read).length;
      setUnreadCount(unread);
    } catch {
      // silently ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  useEffect(() => {
    fetchUnreadCount();

    const handleNotifUpdate = () => {
      fetchUnreadCount();
    };

    const unsub1 = SocketService.on('new_notification', handleNotifUpdate);
    const unsub2 = SocketService.on('notification:created', handleNotifUpdate);
    const unsub3 = SocketService.on('notification_deleted', handleNotifUpdate);
    const unsub4 = SocketService.on('notification:deleted', handleNotifUpdate);
    const unsub5 = SocketService.on('notification_read', handleNotifUpdate);
    const unsub6 = SocketService.on('notification:read', handleNotifUpdate);
    const unsub7 = SocketService.on('notification_cleared', handleNotifUpdate);
    const unsub8 = SocketService.on('notification:cleared', handleNotifUpdate);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
    };
  }, [fetchUnreadCount]);

  const handleLogout = async () => {
    setMenuVisible(false);
    await logout();
  };

  const navigateTo = (screen: string) => {
    setMenuVisible(false);
    navigation.navigate(screen);
  };

  const role = user?.role?.toUpperCase() || 'DONOR';

  // Determine role-specific menu items
  const getMenuItems = () => {
    let items: any[] = [];

    // Role-specific primary actions
    if (role === 'DONOR') {
      items.push(
        { label: 'Post Food Surplus', icon: Package, action: () => navigateTo('CreateDonation'), color: COLORS.brand },
        { label: 'Donor Dashboard', icon: Package, action: () => navigateTo('DonorDashboard') }
      );
    } else if (role === 'NGO') {
      items.push(
        { label: 'Nearby Surplus Radar', icon: Compass, action: () => navigateTo('NgoDashboard'), color: COLORS.brand },
        { label: 'History', icon: History, action: () => navigateTo('NgoDashboard') }
      );
    } else if (role === 'VOLUNTEER') {
      items.push(
        { label: 'Assigned Pickups', icon: Map, action: () => navigateTo('VolunteerDashboard'), color: COLORS.brand }
      );
    } else if (role === 'ADMIN') {
      items.push(
        { label: 'Admin Console', icon: Landmark, action: () => navigateTo('AdminDashboard'), color: '#F59E0B' },
        { label: 'Audit Registry', icon: FileText, action: () => navigateTo('AdminDonations') },
        { label: 'Live Activity Map', icon: Map, action: () => navigateTo('AdminLiveMap') }
      );
    }

    // Common items (Removed Chat, Notifications, Impact Certificates per user request)
    items.push(
      { label: 'Edit Profile', icon: User, action: () => navigateTo('Profile') },
      { label: 'Logout', icon: LogOut, action: handleLogout, color: COLORS.red400 }
    );

    return items;
  };

  const menuItems = getMenuItems();

  return (
    <View style={styles.container}>
      {/* Left: Back button (if inner screen) OR FoodBridge.AI Logo */}
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn} 
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color={COLORS.slate200} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity 
          style={styles.brandContainer} 
          onPress={() => {
            if (role === 'NGO') navigation.navigate('NgoDashboard');
            else if (role === 'VOLUNTEER') navigation.navigate('VolunteerDashboard');
            else if (role === 'ADMIN') navigation.navigate('AdminDashboard');
            else navigation.navigate('DonorDashboard');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.logoBadge}>
            <Heart size={18} color="#10B981" fill="rgba(16, 185, 129, 0.25)" />
          </View>
          <Text style={styles.brandTitle}>
            FoodBridge<Text style={styles.brandAccent}>.AI</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right: Bell Notification + 3-Lines / 3-Dots Menu */}
      <View style={styles.rightSection}>
        <TouchableOpacity 
          onPress={() => navigateTo('Notifications')} 
          style={styles.iconBtn} 
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={{ position: 'relative' }}>
            <Bell size={20} color={COLORS.slate300} />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setMenuVisible(true)} 
          style={styles.iconBtn} 
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={22} color={COLORS.slate300} />
        </TouchableOpacity>
      </View>

      {/* Full Modal Dropdown Menu */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                {/* Header in menu */}
                <View style={styles.menuHeader}>
                  <View>
                    <Text style={styles.menuUserName} numberOfLines={1}>{user?.name || 'User'}</Text>
                    <Text style={styles.menuUserRole}>{role}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setMenuVisible(false)} style={styles.closeBtn}>
                    <X size={18} color={COLORS.slate400} />
                  </TouchableOpacity>
                </View>

                <View style={styles.menuDivider} />

                {menuItems.map((item, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.menuItem} 
                    onPress={item.action}
                    activeOpacity={0.7}
                  >
                    <item.icon size={18} color={item.color || COLORS.slate300} style={styles.menuIcon} />
                    <Text style={[styles.menuText, { color: item.color || COLORS.slate200 }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'ios' ? 60 : 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A101D',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  brandAccent: {
    color: '#10B981',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 54 : 48,
    paddingRight: 12,
  },
  menuContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: 230,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 15,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuUserName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuUserRole: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0A101D',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
});
