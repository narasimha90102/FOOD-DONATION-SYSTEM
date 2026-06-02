import { create } from 'zustand';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'DONOR' | 'NGO' | 'ADMIN';
  profilePicture?: string;
  isVerified: boolean;
  impactPoints: number;
  mealsSaved: number;
  co2Reduction: number;
  activeStreak: number;
  trustScore: number;
  ngoVerificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';
  ngoCapacity?: number;
  ngoAcceptedCategories?: string[];
  address?: string;
  location?: {
    coordinates: [number, number];
  };
}

interface NotificationItem {
  _id: string;
  recipient: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  relatedId?: string;
  createdAt: string;
}

interface ChatRoom {
  _id: string;
  donation: {
    _id: string;
    foodName: string;
    status: string;
  };
  donor: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  ngo: {
    _id: string;
    name: string;
    profilePicture?: string;
  };
  messages: Array<{
    _id: string;
    sender: string;
    text: string;
    imageUrl?: string;
    seen: boolean;
    createdAt: string;
  }>;
  lastMessageAt: string;
}

interface AppState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  notifications: NotificationItem[];
  chats: ChatRoom[];
  theme: 'dark' | 'light';

  // Auth Operations
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  updateUser: (user: Partial<UserProfile>) => void;
  
  // Notification Operations
  setNotifications: (notifications: NotificationItem[]) => void;
  addNotification: (notification: NotificationItem) => void;
  markNotificationRead: (notificationId: string) => void;

  // Chat Operations
  setChats: (chats: ChatRoom[]) => void;
  addMessageToChat: (chatId: string, message: any) => void;
  markChatMessagesSeen: (chatId: string, readerId: string) => void;
  
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => {
  // Load token & user from localStorage safely in NextJS Client
  const getInitialState = () => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('fb_token');
      const storedUser = localStorage.getItem('fb_user');
      return {
        token: storedToken,
        user: storedUser ? JSON.parse(storedUser) : null,
        isAuthenticated: !!storedToken,
      };
    }
    return { token: null, user: null, isAuthenticated: false };
  };

  const initialState = getInitialState();

  return {
    user: initialState.user,
    token: initialState.token,
    isAuthenticated: initialState.isAuthenticated,
    notifications: [],
    chats: [],
    theme: 'dark',

    login: (token, user) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fb_token', token);
        localStorage.setItem('fb_user', JSON.stringify(user));
      }
      set({ token, user, isAuthenticated: true });
    },

    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fb_token');
        localStorage.removeItem('fb_user');
      }
      set({ token: null, user: null, isAuthenticated: false, notifications: [], chats: [] });
    },

    updateUser: (updatedUserFields) => {
      set((state) => {
        if (!state.user) return state;
        const newProfile = { ...state.user, ...updatedUserFields };
        if (typeof window !== 'undefined') {
          localStorage.setItem('fb_user', JSON.stringify(newProfile));
        }
        return { user: newProfile };
      });
    },

    setNotifications: (notifications) => set({ notifications }),
    
    addNotification: (notification) =>
      set((state) => ({
        notifications: [notification, ...state.notifications],
      })),

    markNotificationRead: (notificationId) =>
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n
        ),
      })),

    setChats: (chats) => set({ chats }),

    addMessageToChat: (chatId, message) =>
      set((state) => ({
        chats: state.chats.map((c) => {
          if (c._id === chatId) {
            // Append only if it doesn't exist
            const exists = c.messages.some((m) => m._id === message._id);
            const messages = exists ? c.messages : [...c.messages, message];
            return {
              ...c,
              messages,
              lastMessageAt: message.createdAt,
            };
          }
          return c;
        }),
      })),

    markChatMessagesSeen: (chatId, readerId) =>
      set((state) => ({
        chats: state.chats.map((c) => {
          if (c._id === chatId) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.sender !== readerId ? { ...m, seen: true } : m
              ),
            };
          }
          return c;
        }),
      })),

    toggleTheme: () =>
      set((state) => ({
        theme: state.theme === 'dark' ? 'light' : 'dark',
      })),
  };
});
