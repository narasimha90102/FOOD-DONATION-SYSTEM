import { ApiService } from './api';

export interface AIHealthResponse {
  success: boolean;
  available?: boolean;
  ollama?: boolean;
  model: string;
  message?: string;
}

export interface AIFreshnessResult {
  aiFreshnessScore: number;
  aiSafeWindowHours: number;
  aiRiskLevel: 'safe' | 'warning' | 'danger';
  aiRecommendation: string;
}

export interface FoodAIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export class AIService {
  /**
   * Health check for Food AI engine
   */
  public static async getHealth(): Promise<AIHealthResponse> {
    try {
      return await ApiService.get('/food-ai/health');
    } catch (err: any) {
      try {
        return await ApiService.get('/ai/health');
      } catch {
        return {
          success: false,
          available: false,
          model: 'qwen3:1.7b',
          message: 'AI engine is currently offline.',
        };
      }
    }
  }

  /**
   * Predict food freshness and safety window
   */
  public static async predictFreshness(params: {
    foodCategory: string;
    preparationTime: string | Date;
    estimatedExpiryTime: string | Date;
    storageCondition?: string;
  }): Promise<AIFreshnessResult> {
    const res = await ApiService.post('/ai/predict', params);
    return res.prediction;
  }

  /**
   * Chat with FoodBridge FOOD AI Assistant
   */
  public static async chatWithFoodAI(params: {
    message: string;
    role?: string;
    userName?: string;
    activeContext?: any;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }): Promise<string> {
    try {
      const res = await ApiService.post('/food-ai/chat', params);
      return res.reply || res.response || res.message || 'I am ready to help you with FoodBridge.';
    } catch (err: any) {
      if (err.status === 401) {
        return 'Please log in to your FoodBridge account to access personalized role features.';
      }
      if (err.status === 403) {
        return 'Your account is pending administrator review or permissions.';
      }
      if (err.status === 408 || err.message?.toLowerCase().includes('timeout')) {
        return 'FOOD AI is taking longer than expected. Please try again.';
      }

      // Fallback endpoint attempt
      try {
        const fallbackRes = await ApiService.post('/ai/chat', params);
        return fallbackRes.reply || fallbackRes.response || 'I am ready to help you with FoodBridge.';
      } catch {
        return 'FOOD AI is taking longer than expected. Please try again.';
      }
    }
  }

  /**
   * Backward compatible chat method
   */
  public static async chat(prompt: string): Promise<string> {
    return this.chatWithFoodAI({ message: prompt });
  }
}
