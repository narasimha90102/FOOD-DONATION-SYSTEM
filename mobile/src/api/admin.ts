import { apiClient } from './client';

export const adminApi = {
  getAnalytics: async () => {
    const res = await apiClient.get('/admin/analytics');
    return res.data;
  },
  getUsers: async () => {
    const res = await apiClient.get('/admin/users');
    return res.data;
  },
  verifyUser: async (id: string, isVerified: boolean) => {
    const res = await apiClient.put(`/admin/users/${id}/verify`, { isVerified });
    return res.data;
  },
};
