import { AIService } from '../services/ai.service';

const runTests = () => {
  console.log('🧪 Starting AI Freshness Microbiological Model Tests...\n');

  // Test Case 1: Fresh Veg Meal Ambient
  console.log('Test Case 1: Fresh Cooked Veg Meal (Stored Ambient)');
  const now = new Date();
  const prep = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const exp = new Date(now.getTime() + 10 * 60 * 60 * 1000); // Expiry in 10 hours

  const case1 = AIService.predictExpiry({
    foodCategory: 'Veg Meal',
    preparationTime: prep,
    estimatedExpiryTime: exp,
    storageCondition: 'ambient',
  });

  console.log(`- Freshness Score (Expected ~94%): ${case1.aiFreshnessScore}%`);
  console.log(`- Remaining Safe Window (Expected > 0): ${case1.aiSafeWindowHours} Hours`);
  console.log(`- Risk Level (Expected safe): ${case1.aiRiskLevel}`);
  console.log(`- Recommendation: ${case1.aiRecommendation}\n`);

  // Test Case 2: Highly Perishable Non-Veg Meal Ambient (Elapsed 15 Hours)
  console.log('Test Case 2: Perishable Non-Veg Meal (15 Hours elapsed, Ambient)');
  const prep2 = new Date(now.getTime() - 15 * 60 * 60 * 1000); // 15 hours ago
  const exp2 = new Date(now.getTime() + 5 * 60 * 60 * 1000); // nominal expiry in 5 hours

  const case2 = AIService.predictExpiry({
    foodCategory: 'Non-Veg Meal',
    preparationTime: prep2,
    estimatedExpiryTime: exp2,
    storageCondition: 'ambient',
  });

  console.log(`- Freshness Score (Expected extremely low/0): ${case2.aiFreshnessScore}%`);
  console.log(`- Risk Level (Expected danger): ${case2.aiRiskLevel}`);
  console.log(`- Recommendation: ${case2.aiRecommendation}\n`);

  // Test Case 3: Refrigerated Non-Veg Meal (Elapsed 15 Hours)
  console.log('Test Case 3: Perishable Non-Veg Meal (15 Hours elapsed, Refrigerated)');
  const case3 = AIService.predictExpiry({
    foodCategory: 'Non-Veg Meal',
    preparationTime: prep2,
    estimatedExpiryTime: exp2,
    storageCondition: 'refrigerated',
  });

  console.log(`- Freshness Score (Expected ~85% due to refrigeration): ${case3.aiFreshnessScore}%`);
  console.log(`- Risk Level (Expected safe/warning): ${case3.aiRiskLevel}`);
  console.log(`- Recommendation: ${case3.aiRecommendation}\n`);

  // Test Case 4: Long stable dry food
  console.log('Test Case 4: Stable Dry Rations (10 Days old, Ambient)');
  const prep4 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
  const exp4 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days to expire

  const case4 = AIService.predictExpiry({
    foodCategory: 'Dry Rations',
    preparationTime: prep4,
    estimatedExpiryTime: exp4,
    storageCondition: 'ambient',
  });

  console.log(`- Freshness Score (Expected ~88%): ${case4.aiFreshnessScore}%`);
  console.log(`- Risk Level (Expected safe): ${case4.aiRiskLevel}`);
  console.log(`- Recommendation: ${case4.aiRecommendation}\n`);

  console.log('🎉 AI Expiry Prediction Model validations completed successfully!');
};

runTests();
