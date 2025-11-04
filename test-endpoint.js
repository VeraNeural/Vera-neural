#!/usr/bin/env node
const http = require('http');

const port = 3011;
const child = require('child_process').spawn('node', ['server.js'], {
  cwd: 'C:\\Users\\elvec\\Desktop\\vera-20251101-fresh',
  env: { ...process.env, ALLOW_INSECURE_TLS: '1', PORT: port }
});

let serverReady = false;
child.stdout.on('data', (data) => {
  const msg = data.toString().trim();
  console.log('[SRV]', msg);
  if (msg.includes('running at')) serverReady = true;
});

child.stderr.on('data', (data) => {
  // console.error('[ERR]', data.toString().trim());
});

setTimeout(() => {
  if (!serverReady) {
    console.log('Server not ready yet, waiting...');
    setTimeout(() => test(), 1000);
    return;
  }
  test();
}, 2500);

function test() {
  console.log('\n--- Testing /api/auth/send-trial-magic-link ---');
  const payload = JSON.stringify({ email: 'user@test.com' });
  
  const req = http.request(
    { 
      hostname: 'localhost', 
      port, 
      path: '/api/auth/send-trial-magic-link', 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
        'Host': `localhost:${port}`
      } 
    },
    (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Body:', data);
        child.kill();
        process.exit(0);
      });
    }
  );
  
  req.on('error', (err) => {
    console.error('Request error:', err.message);
    child.kill();
    process.exit(1);
  });
  
  req.write(payload);
  req.end();
}

setTimeout(() => {
  console.error('Timeout');
  child.kill();
  process.exit(1);
}, 8000);
