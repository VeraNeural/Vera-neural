#!/usr/bin/env node
const http = require('http');
const https = require('https');

const PORT = 3012;
const BASE_URL = `http://localhost:${PORT}`;

// Start server
const child = require('child_process').spawn('node', ['server.js'], {
  cwd: 'C:\\Users\\elvec\\Desktop\\vera-20251101-fresh',
  env: { ...process.env, ALLOW_INSECURE_TLS: '1', PORT }
});

let serverReady = false;
const logs = [];

child.stdout.on('data', (data) => {
  const msg = data.toString().trim();
  logs.push(`[SRV] ${msg}`);
  if (msg.includes('running at')) serverReady = true;
});

child.stderr.on('data', (data) => {
  const msg = data.toString().trim();
  if (msg && !msg.includes('TLS')) logs.push(`[ERR] ${msg}`);
});

// Helper to make HTTP requests
function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Host': `localhost:${PORT}`,
        ...headers
      }
    };

    if (body) {
      const json = JSON.stringify(body);
      options.headers['Content-Length'] = json.length;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Tests
const tests = [];

async function runTests() {
  console.log('🧪 VERA Endpoint & Flow Test Suite\n');
  console.log('='.repeat(60));

  // Test 1: Signup/Auth - Send magic link
  tests.push({
    name: 'POST /api/auth/send-trial-magic-link (signup)',
    test: async () => {
      const res = await makeRequest('/api/auth/send-trial-magic-link', 'POST', {
        email: 'testuser@example.com'
      });
      return {
        pass: res.status === 200 && res.body?.success === true,
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  });

  // Test 2: Auth check - Not authenticated
  tests.push({
    name: 'GET /api/auth/check (no auth token)',
    test: async () => {
      const res = await makeRequest('/api/auth/check', 'GET');
      return {
        pass: res.status === 200 && res.body?.authenticated === false,
        details: `Status ${res.status}: ${JSON.stringify(res.body)}`
      };
    }
  });

  // Test 3: Chat endpoint
  tests.push({
    name: 'POST /api/chat (guest message)',
    test: async () => {
      const res = await makeRequest('/api/chat', 'POST', {
        message: 'Hello VERA',
        anonId: 'test_anon_001',
        guestMessageCount: 1
      });
      return {
        pass: res.status === 200 && res.body?.response !== undefined,
        details: `Status ${res.status}: response="${res.body?.response?.slice?.(0, 50)}..." conversationId=${res.body?.conversationId}`
      };
    }
  });

  // Test 4: Conversations list
  tests.push({
    name: 'GET /api/conversations (list)',
    test: async () => {
      const res = await makeRequest('/api/conversations?anonId=test_anon_001', 'GET');
      return {
        pass: res.status === 200 && Array.isArray(res.body?.conversations),
        details: `Status ${res.status}: found ${res.body?.conversations?.length || 0} conversations`
      };
    }
  });

  // Test 5: Static landing page
  tests.push({
    name: 'GET / (landing page)',
    test: async () => {
      const res = await makeRequest('/', 'GET');
      return {
        pass: res.status === 200 && res.raw?.includes('VERA'),
        details: `Status ${res.status}: ${res.raw?.length || 0} bytes`
      };
    }
  });

  // Test 6: Chat page
  tests.push({
    name: 'GET /chat.html (chat UI)',
    test: async () => {
      const res = await makeRequest('/chat.html', 'GET');
      return {
        pass: res.status === 200 && res.raw?.includes('chat'),
        details: `Status ${res.status}: ${res.raw?.length || 0} bytes`
      };
    }
  });

  // Test 7: PWA manifest
  tests.push({
    name: 'GET /site.webmanifest (PWA)',
    test: async () => {
      const res = await makeRequest('/site.webmanifest', 'GET');
      return {
        pass: res.status === 200 && res.body?.name === 'VERA',
        details: `Status ${res.status}: name="${res.body?.name}"`
      };
    }
  });

  // Test 8: Favicon
  tests.push({
    name: 'GET /favicon.svg (favicon)',
    test: async () => {
      const res = await makeRequest('/favicon.svg', 'GET');
      return {
        pass: res.status === 200 && res.raw?.includes('svg'),
        details: `Status ${res.status}: ${res.raw?.length || 0} bytes`
      };
    }
  });

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result.pass) {
        console.log(`✅ ${test.name}`);
        console.log(`   ${result.details}\n`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        console.log(`   ${result.details}\n`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ ${test.name}`);
      console.log(`   ERROR: ${err.message}\n`);
      failed++;
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  console.log('\n🔍 Server Logs:');
  logs.forEach(log => console.log(`  ${log}`));

  child.kill();
  process.exit(failed > 0 ? 1 : 0);
}

// Wait for server to start, then run tests
setTimeout(() => {
  if (!serverReady) {
    console.log('Waiting for server...');
    setTimeout(runTests, 1000);
  } else {
    runTests();
  }
}, 2000);

// Timeout
setTimeout(() => {
  console.error('Timeout waiting for server');
  child.kill();
  process.exit(1);
}, 15000);
