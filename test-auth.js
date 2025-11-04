#!/usr/bin/env node
const http = require('http');

// Start server and wait a moment
const port = 3010;
const child = require('child_process').spawn('node', ['server.js'], {
  cwd: 'C:\\Users\\elvec\\Desktop\\vera-20251101-fresh',
  env: { ...process.env, ALLOW_INSECURE_TLS: '1', PORT: port }
});

let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
  console.log('[SERVER]', data.toString().trim());
});

child.stderr.on('data', (data) => {
  output += data.toString();
  console.error('[SERVER ERROR]', data.toString().trim());
});

setTimeout(() => {
  console.log('\n--- Testing /api/auth endpoint ---');
  const payload = JSON.stringify({ email: 'test@example.com' });
  const req = http.request(
    { hostname: 'localhost', port, path: '/api/auth', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length } },
    (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', data);
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
}, 2000);

// Kill after 10 seconds
setTimeout(() => {
  child.kill();
  process.exit(1);
}, 10000);
