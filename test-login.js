const https = require('https');

const data = JSON.stringify({
  email: 'test@example.com',
  password: 'wrongpassword'
});

const options = {
  hostname: 'food-donation-system1.onrender.com',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);

  let responseData = '';
  res.on('data', d => {
    responseData += d;
  });

  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
