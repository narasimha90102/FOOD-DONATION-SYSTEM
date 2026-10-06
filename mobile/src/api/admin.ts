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
  approveUser: async (id: string, action: 'approve' | 'reject') => {
    const res = await apiClient.put(`/admin/users/${id}/approve`, { action });
    return res.data;
  },
  toggleBlock: async (id: string) => {
    const res = await apiClient.put(`/admin/users/${id}/block`, {});
    return res.data;
  },
  makeAdmin: async (id: string) => {
    const res = await apiClient.put(`/admin/users/${id}/make-admin`, {});
    return res.data;
  },
  deleteUser: async (id: string) => {
    const res = await apiClient.delete(`/admin/users/${id}`);
    return res.data;
  },
  verifyNGO: async (id: string, isVerified: boolean) => {
    const res = await apiClient.put(`/admin/ngos/${id}/verify`, { isVerified });
    return res.data;
  },
};
