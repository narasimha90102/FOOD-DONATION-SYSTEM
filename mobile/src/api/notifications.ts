import { apiClient } from './client';

export const notificationApi = {
  getAll: async () => {
    const res = await apiClient.get('/notifications');
    return res.data;
  },
  markRead: async (id: string) => {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await apiClient.put('/notifications/mark-all-read');
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/notifications/${id}`);
    return res.data;
  },
  deleteAll: async () => {
    const res = await apiClient.delete('/notifications');
    return res.data;
  },
};
