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
   * Approximates food decay using standard microbiological kinetics.
   * Emulates bacterial growth rates based on food type, storage, and elapsed time.
   */
  public static predictExpiry(input: IAIPredictionInput): IAIPredictionOutput {
    const prep = new Date(input.preparationTime).getTime();
    const expiry = new Date(input.estimatedExpiryTime).getTime();
    const now = Date.now();

    // Elapsed hours since preparation
    const elapsedHours = Math.max(0, (now - prep) / (1000 * 60 * 60));
    // Nominally proposed shelf-life (hours)
    const proposedShelfLife = Math.max(1, (expiry - prep) / (1000 * 60 * 60));

    // Base degradation rates (%/hour) at room temperature (ambient)
    let baseDecayRate = 1.0; 
    switch (input.foodCategory) {
      case 'Veg Meal':
        baseDecayRate = 3.0; // Moderate decay
        break;
      case 'Non-Veg Meal':
        baseDecayRate = 5.0; // High microbial risk
        break;
      case 'Dry Rations':
        baseDecayRate = 0.05; // Extremely stable
        break;
      case 'Bakery':
        baseDecayRate = 1.5; // Stales in 2-3 days
        break;
      case 'Fruits':
      case 'Vegetables':
        baseDecayRate = 1.2; // Slowly wilts
        break;
      default:
        baseDecayRate = 2.0;
    }

    // Storage temperature multiplier (Arrhenius temperature coefficient approximation Q10)
    let storageMultiplier = 1.0;
    switch (input.storageCondition) {
      case 'refrigerated':
        storageMultiplier = 0.2; // Reduces bacteria growth by 80%
        break;
      case 'frozen':
        storageMultiplier = 0.02; // Reduces growth by 98%
        break;
      case 'ambient':
      default:
        storageMultiplier = 1.0; // Full rate decay
    }

    // Dynamic degradation calculation
    const effectiveDecayRate = baseDecayRate * storageMultiplier;
    
    // Remaining freshness score (0 - 100)
    let freshnessScore = Math.max(0, Math.round(100 - (elapsedHours * effectiveDecayRate)));

    // Safety consumption window (hours left before food hits high bacterial risk threshold)
    // We assume food is un-consumable when freshness falls below 30%
    const criticalThreshold = 30;
    const hoursLeftBeforeCritical = effectiveDecayRate > 0 
      ? Math.max(0, (freshnessScore - criticalThreshold) / effectiveDecayRate)
      : 720; // Default max 30 days for indefinite storage (e.g. frozen dry goods)

    // Bound safe window between 0 and remaining estimated expiry hours
    const hoursToExpiry = Math.max(0, (expiry - now) / (1000 * 60 * 60));
    const aiSafeWindowHours = Math.min(hoursLeftBeforeCritical, hoursToExpiry);

    // Determine risk levels and recommendations
    let aiRiskLevel: 'safe' | 'warning' | 'danger' = 'safe';
    let aiRecommendation = '';

    if (freshnessScore > 75) {
      aiRiskLevel = 'safe';
      aiRecommendation = 'Freshness is high. Safe to consume. Store standardly and distribute soon.';
    } else if (freshnessScore >= 45) {
      aiRiskLevel = 'warning';
      aiRecommendation = 'Consume soon. Freshness is average. Keep refrigerated and prioritize delivery within 3 hours.';
    } else {
      aiRiskLevel = 'danger';
      aiRecommendation = 'High bacterial/microbial growth risk. Not recommended for children or vulnerable groups. Check odor/mold before any intake.';
    }

    // Edge case correction: if elapsed time is greater than expiry, force danger/0 freshness
    if (now >= expiry) {
      freshnessScore = 5;
      aiRiskLevel = 'danger';
      aiRecommendation = 'Food has reached its estimated expiry. DO NOT distribute.';
    }

    return {
      aiSafeWindowHours: parseFloat(aiSafeWindowHours.toFixed(1)),
      aiFreshnessScore: freshnessScore,
      aiRiskLevel,
      aiRecommendation,
    };
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
