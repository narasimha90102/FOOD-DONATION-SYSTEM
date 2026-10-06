import { FoodAIService } from '../services/foodAI.service';

async function runBackendTests() {
  console.log('🧪 Starting Backend Food AI Test Suite...');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // Test 1: In-scope Donor Query
  const donorRes = await FoodAIService.processMessage({
    message: 'How do I donate food as a donor?',
    userRole: 'DONOR',
    userName: 'Test Donor'
  });
  assert(donorRes.success === true, 'Donor query processed successfully');
  assert(donorRes.reply.length > 20, 'Helpful donation guidance returned');
  assert(donorRes.source.length > 0, 'Knowledge source identified');

  // Test 2: In-scope NGO Query
  const ngoRes = await FoodAIService.processMessage({
    message: 'How do I claim food surplus on the radar?',
    userRole: 'NGO',
    userName: 'Test NGO'
  });
  assert(ngoRes.success === true, 'NGO query processed successfully');
  assert(ngoRes.reply.length > 20, 'NGO claim instructions returned');

  // Test 3: Boundary Guard (Out of scope refusal)
  const outOfScopeRes = await FoodAIService.processMessage({
    message: 'What is the stock price of Apple Inc. today?',
    userRole: 'DONOR'
  });
  assert(outOfScopeRes.success === true, 'Boundary guard executed');
  assert(outOfScopeRes.source === 'boundary_guard' || outOfScopeRes.intent === 'OUT_OF_SCOPE', 'Out of scope correctly flagged');

  // Test 4: System Health check
  const health = await FoodAIService.checkHealth();
  assert(typeof health.success === 'boolean', 'Health check executed');

  console.log(`\n🎉 All ${passed}/${total} Backend Tests Passed Successfully!\n`);
}

runBackendTests().catch((err) => {
  console.error('Backend Test Suite Failed:', err);
  process.exit(1);
});
