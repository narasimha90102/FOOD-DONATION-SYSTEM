import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, LoginPayload, RegisterPayload } from '../api/auth';
import { apiClient } from '../api/client';
import { SocketService } from '../services/socketService';
import { normalizeRole } from '../constants/roles';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'DONOR' | 'NGO' | 'VOLUNTEER' | 'ADMIN';
  phone?: string;
  phoneNumber?: string;
  organization?: string;
  address?: string;
  isVerified?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  ngoVerificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NONE';
  location?: { type: string; coordinates: number[] };
  trustScore?: number;
  impactPoints?: number;
  mealsSaved?: number;
  volunteerAvailability?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<any>;
  register: (payload: RegisterPayload) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * STEP 1: On app launch, restore any cached session.
   * STEP 2: Re-validate the token against the backend (/auth/me).
   *         This ensures we NEVER use a stale role from a previous login.
   * STEP 3: If valid, connect socket and load fresh user object.
   * STEP 4: If token expired or invalid (401), clear everything → Login screen.
   */
  const loadStorageData = async () => {
    try {
      const [storedToken, storedUser] = await AsyncStorage.multiGet([
        'auth_token',
        'user_data',
      ]);

      const savedToken = storedToken[1];
      const savedUserRaw = storedUser[1];

      if (!savedToken || !savedUserRaw) {
        // No session — show Login
        setLoading(false);
        return;
      }

      // Optimistically set state so screen renders immediately
      const cachedUser: User = JSON.parse(savedUserRaw);
      setToken(savedToken);
      setUser(cachedUser);

      // ── Re-validate with backend ─────────────────────────────────────────
      // This is the KEY fix: we always fetch the authoritative user from DB.
      // Even if AsyncStorage had a stale role, the fresh DB record is used.
      try {
        const meRes = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (meRes.data.success && meRes.data.user) {
          const freshUser: User = meRes.data.user;
          // Normalize role to uppercase canonical form
          freshUser.role = normalizeRole(freshUser.role) as User['role'];

          setUser(freshUser);
          await AsyncStorage.setItem('user_data', JSON.stringify(freshUser));

          // Connect socket with validated user ID
          SocketService.connect(freshUser._id);
          console.log(`[Auth] Session restored. Role: ${freshUser.role}, User: ${freshUser.email}`);
        } else {
          // Backend returned unexpected response — clear session
          await clearSession();
        }
      } catch (validationErr: any) {
        if (validationErr?.response?.status === 401 ||
            validationErr?.response?.status === 403) {
          // Token expired or revoked — force logout
          console.warn('[Auth] Token validation failed — clearing session');
          await clearSession();
        } else {
          // Network error or server down — keep cached user (offline tolerance)
          // But still connect socket if network recovers
          console.warn('[Auth] Network error during token validation — using cached user');
          SocketService.connect(cachedUser._id);
        }
      }
    } catch (e) {
      console.error('[Auth] loadStorageData failed:', e);
      await clearSession();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorageData();
    // Cleanup socket on unmount
    return () => {
      // Do NOT disconnect here — app lifecycle handles this
    };
  }, []);

  /**
   * Clears all auth state and stored credentials.
   * Used by: logout(), 401 handler, token validation failure.
   */
  const clearSession = async () => {
    setUser(null);
    setToken(null);
    SocketService.disconnect();
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
  };

  /**
   * LOGIN:
   * 1. Call backend — get token + fresh user with authoritative role
   * 2. Normalize role to canonical uppercase
   * 3. Store in state + AsyncStorage
   * 4. Connect socket and authenticate
   */
  const login = async (payload: LoginPayload): Promise<any> => {
    // Clear any previous session FIRST — prevents role leakage between accounts
    await clearSession();

    const res = await authApi.login(payload);

    if (res.success && res.token && res.user) {
      const freshUser: User = res.user;
      // Canonical role normalization — the ONLY place role is set on login
      freshUser.role = normalizeRole(freshUser.role) as User['role'];

      setToken(res.token);
      setUser(freshUser);

      await AsyncStorage.setItem('auth_token', res.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(freshUser));

      // Connect socket with fresh user ID
      SocketService.connect(freshUser._id);

      console.log(`[Auth] Login successful. Role: ${freshUser.role}, User: ${freshUser.email}`);
      return res;
    } else if (
      res.code === 'ACCOUNT_PENDING_APPROVAL' ||
      res.code === 'ACCOUNT_REJECTED'
    ) {
      throw new Error(res.message);
    } else {
      throw new Error(res.message || 'Login failed');
    }
  };

  /**
   * REGISTER:
   * 1. Call backend register
   * 2. If user gets immediate token (DONOR), normalize role and set state
   * 3. If pending approval (NGO/VOLUNTEER), just return success — no session
   */
  const register = async (payload: RegisterPayload): Promise<any> => {
    // Clear any previous session FIRST
    await clearSession();

    const res = await authApi.register(payload);

    if (res.success && res.token && res.user) {
      const freshUser: User = res.user;
      freshUser.role = normalizeRole(freshUser.role) as User['role'];

      setToken(res.token);
      setUser(freshUser);

      await AsyncStorage.setItem('auth_token', res.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(freshUser));

      SocketService.connect(freshUser._id);

      return res;
    } else if (res.success && res.code === 'ACCOUNT_PENDING_APPROVAL') {
      // NGO/Volunteer — account pending, no session to set
      return res;
    } else {
      throw new Error(res.message || 'Registration failed');
    }
  };

  /**
   * LOGOUT:
   * 1. Disconnect socket
   * 2. Clear all state synchronously
   * 3. Clear AsyncStorage
   * 4. Navigation to Login is handled by RootNavigator (user becomes null)
   */
  const logout = async () => {
    console.log('[Auth] Logging out — clearing all session data');
    await clearSession();
  };

  /**
   * REFRESH USER:
   * Fetches latest user profile from backend and updates state.
   * Use after profile updates or when role/status may have changed.
   */
  const refreshUser = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.success && res.user) {
        const freshUser: User = res.user;
        freshUser.role = normalizeRole(freshUser.role) as User['role'];
        setUser(freshUser);
        await AsyncStorage.setItem('user_data', JSON.stringify(freshUser));
      }
    } catch (e) {
      console.error('[Auth] refreshUser failed:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
