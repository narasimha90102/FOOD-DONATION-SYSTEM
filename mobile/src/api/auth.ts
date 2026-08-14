import { apiClient } from './client';

export interface LoginPayload {
  email?: string;
  password?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  role: 'donor' | 'ngo' | 'volunteer' | 'admin';
  phone?: string;
  organization?: string;
  address?: string;
}

export const authApi = {
  login: async (payload: LoginPayload) => {
    const res = await apiClient.post('/auth/login', payload);
    return res.data;
  },
  register: async (payload: RegisterPayload) => {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },
  getProfile: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  updateProfile: async (data: any) => {
    const res = await apiClient.put('/auth/profile', data);
    return res.data;
  },
};
