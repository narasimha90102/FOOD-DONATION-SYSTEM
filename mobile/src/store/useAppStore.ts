import { create } from 'zustand';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'DONOR' | 'NGO' | 'VOLUNTEER' | 'ADMIN';
  isVerified: boolean;
  trustScore: number;
  ngoVerificationStatus?: string;
  approvalStatus?: string;
}

type Screen = 'LANDING' | 'LOGIN' | 'REGISTER' | 'DONOR_DASHBOARD' | 'NGO_DASHBOARD' | 'VOLUNTEER_DASHBOARD' | 'CHAT' | 'MAP';

interface MobileAppState {
  user: UserProfile | null;
  token: string | null;
  currentScreen: Screen;
  activeChatId: string | null;
  activeDonationId: string | null;

  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  navigate: (screen: Screen, params?: { chatId?: string; donationId?: string }) => void;
}

const getHomeScreen = (role: string): Screen => {
  switch (role) {
    case 'NGO': return 'NGO_DASHBOARD';
    case 'VOLUNTEER': return 'VOLUNTEER_DASHBOARD';
    default: return 'DONOR_DASHBOARD';
  }
};

export const useAppStore = create<MobileAppState>((set) => ({
  user: null,
  token: null,
  currentScreen: 'LANDING',
  activeChatId: null,
  activeDonationId: null,

  login: (token, user) => set({ token, user, currentScreen: getHomeScreen(user.role) }),
  logout: () => set({ token: null, user: null, currentScreen: 'LANDING', activeChatId: null, activeDonationId: null }),
  navigate: (screen, params) => set({
    currentScreen: screen,
    activeChatId: params?.chatId || null,
    activeDonationId: params?.donationId || null,
  }),
}));
