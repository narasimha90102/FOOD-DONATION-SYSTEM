import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, LoginPayload, RegisterPayload } from '../api/auth';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  phone?: string;
  organization?: string;
  address?: string;
  isVerified?: boolean;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadStorageData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to load storage data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  const login = async (payload: LoginPayload) => {
    const res = await authApi.login(payload);
    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      await AsyncStorage.setItem('auth_token', res.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(res.user));
    } else {
      throw new Error(res.message || 'Login failed');
    }
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authApi.register(payload);
    if (res.success && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      await AsyncStorage.setItem('auth_token', res.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(res.user));
    } else {
      throw new Error(res.message || 'Registration failed');
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.success && res.user) {
        setUser(res.user);
        await AsyncStorage.setItem('user_data', JSON.stringify(res.user));
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
