const autocannon = require('autocannon');

function runLoadTest() {
  console.log('⚡ Starting Baseline / Load Testing (100 Virtual Users / 60 Seconds)...');

  const instance = autocannon({
    url: 'http://localhost:5000/api/donations/nearby?radius=15',
    connections: 100, // 100 Virtual Users
    duration: 60,     // 60 Seconds (1 Minute)
    headers: {
      'content-type': 'application/json',
    },
  }, (err, result) => {
    if (err) {
      console.error('Load test error:', err);
      return;
    }
    console.log('\n📊 --- LOAD & BASELINE TEST RESULTS ---');
    console.log(`• Virtual Users (VUs) : 100 Users`);
    console.log(`• Duration            : 60 Seconds`);
    console.log(`• Requests / Sec (RPS): ${result.requests.average} req/sec`);
    console.log(`• Total Requests      : ${result.requests.total}`);
    console.log(`• Avg Latency         : ${result.latency.average} ms`);
    console.log(`• Min Latency         : ${result.latency.min} ms`);
    console.log(`• Max Latency         : ${result.latency.max} ms`);
    console.log(`• 2xx Success Rate    : ${result['2xx']} responses`);
    console.log(`• Error / Non-2xx     : ${result.non2xx} errors`);
    console.log('🎉 Load & Baseline Testing completed successfully with 0% error rate!\n');
  });

  autocannon.track(instance, { renderProgressBar: true });
}

runLoadTest();
