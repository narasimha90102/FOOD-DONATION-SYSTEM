import { apiClient } from './client';

export interface CreateDonationPayload {
  foodName: string;
  foodCategory: string;
  quantity: number;
  unit: string;
  preparationTime: string | Date;
  estimatedExpiryTime: string | Date;
  storageCondition: 'ambient' | 'refrigerated' | 'frozen';
  pickupAddress: string;
  coordinates: [number, number]; // [lng, lat]
  specialInstructions?: string;
  foodImages?: string[];
}

export const donationApi = {
  create: async (payload: CreateDonationPayload) => {
    const res = await apiClient.post('/donations', payload);
    return res.data;
  },
  update: async (id: string, payload: Partial<CreateDonationPayload>) => {
    const res = await apiClient.put(`/donations/${id}`, payload);
    return res.data;
  },
  getDonorStats: async () => {
    const res = await apiClient.get('/donations/donor-stats');
    return res.data;
  },
  getAll: async (status?: string, longitude?: number, latitude?: number) => {
    let url = `/donations?status=${status || ''}`;
    if (longitude !== undefined && latitude !== undefined) {
      url += `&longitude=${longitude}&latitude=${latitude}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  },
  getNearby: async (radius = 15, longitude?: number, latitude?: number) => {
    let url = `/donations/nearby?radius=${radius}`;
    if (longitude !== undefined && latitude !== undefined) {
      url += `&longitude=${longitude}&latitude=${latitude}`;
    }
    const res = await apiClient.get(url);
    return res.data;
  },
  getById: async (id: string) => {
    const res = await apiClient.get(`/donations/${id}`);
    return res.data;
  },
  getTracking: async (id: string) => {
    const res = await apiClient.get(`/donations/${id}/tracking`);
    return res.data;
  },
  acceptDonation: async (id: string, destinationAddress: string, destinationCoordinates: [number, number]) => {
    const res = await apiClient.put(`/donations/${id}/accept`, {
      destinationAddress,
      destinationCoordinates,
    });
    return res.data;
  },
  updateStatus: async (id: string, status: string) => {
    const res = await apiClient.put(`/donations/${id}/status`, { status });
    return res.data;
  },
  assignVolunteer: async (id: string) => {
    const res = await apiClient.put(`/donations/${id}/assign-volunteer`, {});
    return res.data;
  },
  volunteerCancel: async (id: string, reason: string, proofPhoto: string) => {
    const res = await apiClient.put(`/donations/${id}/volunteer-cancel`, { reason, proofPhoto });
    return res.data;
  },
  distributeDonation: async (id: string, distributedQuantity: number, beneficiaryNotes?: string) => {
    const res = await apiClient.put(`/donations/${id}/distribute`, { distributedQuantity, beneficiaryNotes });
    return res.data;
  },
};
