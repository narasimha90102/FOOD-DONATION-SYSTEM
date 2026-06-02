import { create } from 'zustand';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'DONOR' | 'NGO' | 'ADMIN';
  isVerified: boolean;
  trustScore: number;
  ngoVerificationStatus: string;
}

interface MobileAppState {
  user: UserProfile | null;
  token: string | null;
  currentScreen: 'LANDING' | 'LOGIN' | 'REGISTER' | 'DONOR_DASHBOARD' | 'NGO_DASHBOARD' | 'CHAT' | 'MAP';
  activeChatId: string | null;
  activeDonationId: string | null;
  
  // Handlers
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  navigate: (screen: 'LANDING' | 'LOGIN' | 'REGISTER' | 'DONOR_DASHBOARD' | 'NGO_DASHBOARD' | 'CHAT' | 'MAP', params?: { chatId?: string; donationId?: string }) => void;
}

export const useAppStore = create<MobileAppState>((set) => ({
  user: null,
  token: null,
  currentScreen: 'LANDING',
  activeChatId: null,
  activeDonationId: null,

  login: (token, user) => set({ token, user, currentScreen: user.role === 'NGO' ? 'NGO_DASHBOARD' : 'DONOR_DASHBOARD' }),
  logout: () => set({ token: null, user: null, currentScreen: 'LANDING', activeChatId: null, activeDonationId: null }),
  navigate: (screen, params) => set({
    currentScreen: screen,
    activeChatId: params?.chatId || null,
    activeDonationId: params?.donationId || null,
  }),
}));
