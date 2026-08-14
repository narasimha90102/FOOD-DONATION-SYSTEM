import { apiClient } from './client';

export const chatApi = {
  getMessages: async (donationId: string) => {
    const res = await apiClient.get(`/chats/${donationId}`);
    return res.data;
  },
  sendMessage: async (donationId: string, text: string) => {
    const res = await apiClient.post(`/chats/${donationId}`, { text });
    return res.data;
  },
};
