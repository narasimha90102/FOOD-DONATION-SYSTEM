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
};
