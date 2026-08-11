import { IDonation, IUser } from '../types';

export interface IAIPredictionInput {
  foodCategory: string;
  preparationTime: Date;
  estimatedExpiryTime: Date;
  storageCondition: 'ambient' | 'refrigerated' | 'frozen';
}

export interface IAIPredictionOutput {
  aiSafeWindowHours: number;
  aiFreshnessScore: number;
  aiRiskLevel: 'safe' | 'warning' | 'danger';
  aiRecommendation: string;
}

export class AIService {
  /**
   * Evaluates food freshness and safety window by calling local Ollama using qwen3:1.7b.
   */
  public static async predictExpiry(input: IAIPredictionInput): Promise<IAIPredictionOutput> {
    try {
      const promptText = `Analyze the following food surplus donation specifications and output a JSON object containing:
1. "aiSafeWindowHours": a floating point number representing how many hours the food remains completely safe to consume, capped at 24 hours.
2. "aiFreshnessScore": an integer between 0 and 100 representing the food's current freshness percentage.
3. "aiRiskLevel": one of "safe", "warning", or "danger".
4. "aiRecommendation": a professional, concise food safety and storage recommendation.

Input Specifications:
- Food Category: "${input.foodCategory}"
- Preparation Time: "${new Date(input.preparationTime).toISOString()}"
- Estimated Expiry Time: "${new Date(input.estimatedExpiryTime).toISOString()}"
- Storage Condition: "${input.storageCondition}"
- Current Time: "${new Date().toISOString()}"

Output ONLY a valid JSON object matching the schema. No explanations, no markdown formatting.`;

      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3:1.7b',
          prompt: promptText,
          stream: false,
          format: 'json'
        }),
      });

      if (!response.ok) {
        throw new Error('Ollama service returned an error status.');
      }

      const data: any = await response.json();
      if (!data || !data.response) {
        throw new Error('Empty response from Ollama.');
      }

      const parsed = JSON.parse(data.response);

      // Validate output fields and bounds
      const aiFreshnessScore = typeof parsed.aiFreshnessScore === 'number' 
        ? Math.min(100, Math.max(0, parsed.aiFreshnessScore)) 
        : 75;

      const aiSafeWindowHours = typeof parsed.aiSafeWindowHours === 'number' 
        ? Math.min(24, Math.max(0, parsed.aiSafeWindowHours)) 
        : 8;

      let aiRiskLevel: 'safe' | 'warning' | 'danger' = 'safe';
      if (parsed.aiRiskLevel === 'warning' || parsed.aiRiskLevel === 'danger') {
        aiRiskLevel = parsed.aiRiskLevel;
      } else if (aiFreshnessScore < 45) {
        aiRiskLevel = 'danger';
      } else if (aiFreshnessScore < 75) {
        aiRiskLevel = 'warning';
      }

      return {
        aiSafeWindowHours: parseFloat(aiSafeWindowHours.toFixed(1)),
        aiFreshnessScore,
        aiRiskLevel,
        aiRecommendation: parsed.aiRecommendation || 'Consume soon and inspect food before intake.',
      };

    } catch (error) {
      console.error('[AIService] Ollama API request failed:', error);
      throw new Error('Local AI service is unavailable. Please start Ollama.');
    }
  }

  /**
   * Queries local Ollama connectivity status
   */
  public static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch (err) {
      return false;
    }
  }

  /**
   * Generates a dynamic trust score (0 - 100) for a donation.
   * Aggregates donor ratings history, elapsed freshness, and general reports.
   */
  public static calculateTrustScore(donor: IUser, donationFreshness: number): number {
    let baseScore = donor.trustScore;

    // Weight 1: Donor Rating Average (scale 1-5 maps to up to +10 or -20)
    const ratingWeight = (donor.ratingAverage - 3) * 5; // e.g. 5.0 rating -> +10 points, 2.0 rating -> -5 points
    
    // Weight 2: Donation Expiry Risk
    let freshnessPenalty = 0;
    if (donationFreshness < 45) {
      freshnessPenalty = -15;
    } else if (donationFreshness < 75) {
      freshnessPenalty = -5;
    }

    // Weight 3: Dynamic Verification status (approved NGOs/Donors get bonuses)
    const verificationBonus = donor.isVerified ? 10 : 0;

    let finalTrust = Math.min(100, Math.max(0, Math.round(baseScore + ratingWeight + freshnessPenalty + verificationBonus)));
    
    return finalTrust;
  }
}
