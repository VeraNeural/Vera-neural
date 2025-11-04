require('dotenv').config();
const path = require('path');
const express = require('express');

// Initialize Sentry early
const { initSentry, sentryRequestMiddleware, sentryErrorMiddleware, captureApiError } = require('./lib/sentry-config');
initSentry();

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

// Add Sentry request tracking middleware (must be early)
app.use(sentryRequestMiddleware);

// Stripe webhook must use the raw body to verify the signature
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const handler = require('./api/webhook');
    return handler(req, res);
  } catch (err) {
    console.error('Webhook route error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// JSON parser for all other API routes
app.use(express.json({ limit: '2mb' }));

// Map Vercel-style serverless functions to Express routes
const routes = [
  'chat',
  'auth',
  'verify',
  'tts',
  'analyze',
  'checkout',
  'portal',
  'subscription-status',
  'history',
  'request-magic-link',
  'create-checkout-session',
  'create-portal-session',
  'auth-check',
  'journaling',
  'grounding',
  'profile-update',
  'saved-messages'
];

routes.forEach((name) => {
  const routePath = `/api/${name}`;
  app.all(routePath, async (req, res) => {
    try {
      const handler = require(`./api/${name}.js`);
      return handler(req, res);
    } catch (err) {
      console.error(`Error handling ${routePath}:`, err);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// Alias: Support /api/auth/check for frontend compatibility (maps to auth-check)
app.all('/api/auth/check', async (req, res) => {
  try {
    const handler = require('./api/auth-check.js');
    return handler(req, res);
  } catch (err) {
    console.error('Error handling /api/auth/check:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Alias: Support nested path used by landing page for magic link
app.all('/api/auth/send-trial-magic-link', async (req, res) => {
  try {
    const handler = require('./api/auth.js');
    return handler(req, res);
  } catch (err) {
    console.error('Error handling /api/auth/send-trial-magic-link:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Conversations routes (list/get/delete)
const conversations = require('./api/conversations');
app.get('/api/conversations', conversations.list);
app.get('/api/conversations/:id', conversations.get);
app.delete('/api/conversations/:id', conversations.remove);

// Auth logout stub for compatibility
app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ success: true });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Mobile detection middleware
function isMobileUserAgent(userAgent) {
  if (!userAgent) return false;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent);
}

// Route for /chat.html - detect mobile and serve appropriate version
app.get('/chat.html', (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = isMobileUserAgent(userAgent);
  
  console.log(`📱 Chat request - Mobile: ${isMobile}, UA: ${userAgent.substring(0, 50)}...`);
  
  const fileName = isMobile ? 'chat-mobile.html' : 'chat.html';
  res.sendFile(path.join(__dirname, 'public', fileName));
});

// Route for /checkout - serve checkout page
app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

app.get('/checkout.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add Sentry error tracking middleware (must be after route handlers)
app.use(sentryErrorMiddleware);

// Global error handler for unhandled exceptions
app.use((err, req, res, next) => {
  captureApiError(err, {
    endpoint: req.path,
    method: req.method,
    statusCode: 500,
    tags: { source: 'express_error_handler' }
  });

  console.error('❌ Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

// Resilient listen: if the chosen port is in use, try the next few ports automatically
function startServer(port, attempts = 0) {
  const server = app.listen(port, () => {
    console.log(`VERA local server running at http://localhost:${port}`);
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempts < 10) {
      const next = port + 1;
      console.warn(`Port ${port} in use, trying ${next}...`);
      startServer(next, attempts + 1);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT);

// --- Static asset fallbacks to avoid 404s in local dev ---
// Tiny 1x1 transparent PNG
const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axu1EIAAAAASUVORK5CYII=';

app.get(['/android-chrome-192x192.png', '/android-chrome-512x512.png', '/apple-touch-icon.png'], (req, res) => {
  try {
    res.type('png').send(Buffer.from(tinyPngBase64, 'base64'));
  } catch (e) {
    res.status(404).end();
  }
});

app.get('/favicon.svg', (req, res) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#9B8FD4"/>
        <stop offset="100%" stop-color="#7B9EF0"/>
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="28" fill="url(#g)"/>
    <text x="32" y="38" font-size="20" font-family="Segoe UI, Arial" fill="#fff" text-anchor="middle">V</text>
  </svg>`;
  res.type('image/svg+xml').send(svg);
});

app.get('/site.webmanifest', (req, res) => {
  const manifest = {
    name: 'VERA',
    short_name: 'VERA',
    start_url: '/chat.html',
    display: 'standalone',
    background_color: '#E8D5F2',
    theme_color: '#667eea',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
    ]
  };
  res.type('application/manifest+json').send(JSON.stringify(manifest));
});
