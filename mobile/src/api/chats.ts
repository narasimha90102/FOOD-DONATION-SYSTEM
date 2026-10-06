import { apiClient } from './client';

export const chatApi = {
  getChats: async () => {
    const res = await apiClient.get('/chats');
    return res.data;
  },
  getMessages: async (chatId: string) => {
    const res = await apiClient.get(`/chats/${chatId}`);
    return res.data;
  },
  sendMessage: async (chatId: string, text: string, imageUrl?: string) => {
    const res = await apiClient.post(`/chats/${chatId}/messages`, { text, imageUrl });
    return res.data;
  },
};
