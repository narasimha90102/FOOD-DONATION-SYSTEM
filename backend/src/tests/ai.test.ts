import { AIService } from '../services/ai.service';

const runTests = async () => {
  console.log('🧪 Starting AI Freshness Ollama Model Tests...\n');

  try {
    const isConnected = await AIService.checkHealth();
    console.log(`Ollama Health check: ${isConnected ? 'Connected' : 'Disconnected'}\n`);

    // Test Case 1: Fresh Veg Meal Ambient
    console.log('Test Case 1: Fresh Cooked Veg Meal (Stored Ambient)');
    const now = new Date();
    const prep = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const exp = new Date(now.getTime() + 10 * 60 * 60 * 1000); // Expiry in 10 hours

    const case1 = await AIService.predictExpiry({
      foodCategory: 'Veg Meal',
      preparationTime: prep,
      estimatedExpiryTime: exp,
      storageCondition: 'ambient',
    });

    console.log(`- Freshness Score: ${case1.aiFreshnessScore}%`);
    console.log(`- Remaining Safe Window: ${case1.aiSafeWindowHours} Hours`);
    console.log(`- Risk Level: ${case1.aiRiskLevel}`);
    console.log(`- Recommendation: ${case1.aiRecommendation}\n`);

    // Test Case 2: Highly Perishable Non-Veg Meal Ambient (Elapsed 15 Hours)
    console.log('Test Case 2: Perishable Non-Veg Meal (15 Hours elapsed, Ambient)');
    const prep2 = new Date(now.getTime() - 15 * 60 * 60 * 1000); // 15 hours ago
    const exp2 = new Date(now.getTime() + 5 * 60 * 60 * 1000); // nominal expiry in 5 hours

    const case2 = await AIService.predictExpiry({
      foodCategory: 'Non-Veg Meal',
      preparationTime: prep2,
      estimatedExpiryTime: exp2,
      storageCondition: 'ambient',
    });

    console.log(`- Freshness Score: ${case2.aiFreshnessScore}%`);
    console.log(`- Risk Level: ${case2.aiRiskLevel}`);
    console.log(`- Recommendation: ${case2.aiRecommendation}\n`);

    // Test Case 3: Refrigerated Non-Veg Meal (Elapsed 15 Hours)
    console.log('Test Case 3: Perishable Non-Veg Meal (15 Hours elapsed, Refrigerated)');
    const case3 = await AIService.predictExpiry({
      foodCategory: 'Non-Veg Meal',
      preparationTime: prep2,
      estimatedExpiryTime: exp2,
      storageCondition: 'refrigerated',
    });

    console.log(`- Freshness Score: ${case3.aiFreshnessScore}%`);
    console.log(`- Risk Level: ${case3.aiRiskLevel}`);
    console.log(`- Recommendation: ${case3.aiRecommendation}\n`);

    // Test Case 4: Long stable dry food
    console.log('Test Case 4: Stable Dry Rations (10 Days old, Ambient)');
    const prep4 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    const exp4 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days to expire

    const case4 = await AIService.predictExpiry({
      foodCategory: 'Dry Rations',
      preparationTime: prep4,
      estimatedExpiryTime: exp4,
      storageCondition: 'ambient',
    });

    console.log(`- Freshness Score: ${case4.aiFreshnessScore}%`);
    console.log(`- Risk Level: ${case4.aiRiskLevel}`);
    console.log(`- Recommendation: ${case4.aiRecommendation}\n`);

    console.log('🎉 AI Expiry Prediction Model validations completed successfully!');
  } catch (err: any) {
    console.error('❌ AI test suite failed:', err.message);
  }
};

runTests();
