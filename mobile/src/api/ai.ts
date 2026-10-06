import { apiClient } from './client';

export interface AIHealthStatus {
  success: boolean;
  available?: boolean;
  model: string;
  message?: string;
}

export const getFoodAIHealth = async (): Promise<AIHealthStatus> => {
  try {
    const res = await apiClient.get('/food-ai/health');
    return res.data;
  } catch {
    const fallbackRes = await apiClient.get('/ai/health');
    return fallbackRes.data;
  }
};

export const predictFreshness = async (payload: {
  foodCategory: string;
  preparationTime: string | Date;
  estimatedExpiryTime: string | Date;
  storageCondition?: string;
}) => {
  const res = await apiClient.post('/ai/predict', payload);
  return res.data;
};

export const sendAIChat = async (prompt: string) => {
  const res = await apiClient.post('/food-ai/chat', { message: prompt });
  return res.data;
};

export const sendFoodAIChat = async (params: {
  message: string;
  role?: string;
  userName?: string;
  activeContext?: any;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}) => {
  try {
    const res = await apiClient.post('/food-ai/chat', params);
    return res.data;
  } catch {
    const fallbackRes = await apiClient.post('/ai/chat', params);
    return fallbackRes.data;
  }
};
