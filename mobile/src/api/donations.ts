import { apiClient } from './client';

export interface CreateDonationPayload {
  foodTitle: string;
  foodType: string;
  quantityKg: number;
  servings: number;
  expiryHours: number;
  pickupAddress: string;
  notes?: string;
  coordinates?: { lat: number; lng: number };
}

export const donationApi = {
  create: async (payload: CreateDonationPayload) => {
    const res = await apiClient.post('/donations', payload);
    return res.data;
  },
  getMyDonations: async () => {
    const res = await apiClient.get('/donations/my');
    return res.data;
  },
  getAvailable: async () => {
    const res = await apiClient.get('/donations/available');
    return res.data;
  },
  getAssigned: async () => {
    const res = await apiClient.get('/donations/assigned');
    return res.data;
  },
  claimDonation: async (id: string) => {
    const res = await apiClient.put(`/donations/${id}/claim`);
    return res.data;
  },
  updateStatus: async (id: string, status: string) => {
    const res = await apiClient.put(`/donations/${id}/status`, { status });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get(`/donations/${id}`);
    return res.data;
  },
};
