# VERA Setup & Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (Supabase cloud account)
- Resend API key for emails
- Anthropic API key for chat
- Stripe keys (optional, for production billing)

### Local Development

#### 1. Environment Setup
```powershell
# PowerShell
$env:ALLOW_INSECURE_TLS='1'; npm run dev
```

Or add to `.env`:
```
ALLOW_INSECURE_TLS=1
POSTGRES_URL_NON_POOLING=postgres://user:pass@host:5432/db?sslmode=require
RESEND_API_KEY=re_xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

#### 2. Start the Server
```bash
npm install
npm run dev
```

**Expected Output:**
```
[security] ALLOW_INSECURE_TLS=1 set: TLS certificate verification is DISABLED. Do not use in production.
VERA local server running at http://localhost:3000
(or next available port: 3001, 3002, etc.)
```

#### 3. Access the App
- **Landing Page:** http://localhost:3000
- **Chat UI:** http://localhost:3000/chat.html
- **Test Endpoint:** http://localhost:3000/api/auth/check

---

## 🔐 TLS Certificate Handling

### Local Development (Supabase)
Supabase uses self-signed or untrusted certificates in some regions. For local dev:

```bash
# Set this environment variable
export ALLOW_INSECURE_TLS=1
npm run dev
```

**What happens:**
- Node's TLS verification is disabled locally
- Server logs a warning (expected)
- Connection to Supabase succeeds
- DO NOT use this in production

### Production (Vercel)
```bash
# On Vercel, NEVER set ALLOW_INSECURE_TLS
# Let Node verify certificates normally
# Vercel's environment uses trusted CAs
```

---

## 📧 Email Configuration

### Resend API
The app uses Resend to send magic link emails.

1. **Get API Key:** https://resend.com → Settings → API Keys
2. **Add to `.env`:**
   ```
   RESEND_API_KEY=re_xxx
   EMAIL_FROM=support@yourmail.com
   ```
3. **Verify Sender Domain:** Configure on Resend dashboard

### Testing Email Flow
```bash
node -e "
  const { generateToken, sendMagicLink } = require('./lib/auth');
  const token = generateToken();
  sendMagicLink('test@example.com', token, 'http://localhost:3000');
"
```

---

## 🗄️ Database Schema

### Tables
- **users**: Email, subscription status, trial period, Stripe customer ID
- **conversations**: User conversations with messages
- **messages**: Individual messages with conversation_id
- **magic_links**: One-time login tokens
- **pattern_analyses**: User pattern analysis results

### Initialization
Tables are auto-created on first query. No manual migration needed.

---

## 🧪 Testing

### Run Full Test Suite
```bash
node test-full-flow.js
```

**Output:**
```
✅ 8/8 endpoints passing
✅ Signup → magic link flow verified
✅ Database connections working
```

### Test Individual Endpoints
```bash
# Auth signup
curl -X POST http://localhost:3000/api/auth/send-trial-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","anonId":"test_123","guestMessageCount":1}'

# List conversations
curl http://localhost:3000/api/conversations?anonId=test_123
```

---

## 🚀 Deployment (Vercel)

### Pre-deployment Checklist
- [ ] Remove test files: `test-*.js`, `VERIFICATION_REPORT.md`
- [ ] Verify `.env` is NOT committed (check `.gitignore`)
- [ ] Confirm Vercel env vars are set:
  - `ALLOW_INSECURE_TLS` → NOT SET (default to secure)
  - `POSTGRES_URL_NON_POOLING` → Supabase URI
  - `RESEND_API_KEY` → Valid key
  - `ANTHROPIC_API_KEY` → Valid key
  - `EMAIL_FROM` → Your Resend domain

### Deploy
```bash
npx vercel deploy --prod
```

### Verify Deployment
```bash
# Get Vercel URL from deployment
# Test the landing page
curl https://your-app.vercel.app/

# Test API
curl -X POST https://your-app.vercel.app/api/auth/send-trial-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 🐛 Troubleshooting

### "Port already in use"
The server auto-selects the next available port. Check logs:
```
Port 3000 in use, trying 3001...
Port 3001 in use, trying 3002...
VERA local server running at http://localhost:3002
```

### "500 Internal Server Error" on signup
**Cause:** Database connection failure (usually TLS)
**Fix:**
```powershell
$env:ALLOW_INSECURE_TLS='1'; npm run dev
```

### "Magic link email not received"
**Causes:**
1. Resend API key invalid → Check `.env`
2. Domain not verified → Verify on Resend dashboard
3. Email marked as spam → Check spam folder
4. API quota exceeded → Check Resend dashboard

### "Chat not responding"
**Causes:**
1. Anthropic API key invalid
2. API rate limit hit (shows as "Overloaded")
3. Network issue

**Fix:** Check `.env` keys, wait 30s, retry

---

## 📚 Project Structure
```
vera-20251101-fresh/
├── api/
│   ├── auth.js           # Signup & magic link
│   ├── chat.js           # Chat endpoint
│   ├── verify.js         # Magic link verification
│   ├── conversations.js  # Conversation CRUD
│   └── ...
├── lib/
│   ├── database.js       # DB layer & TLS config
│   ├── auth.js           # Email & token utils
│   ├── claude.js         # Anthropic integration
│   └── ...
├── public/
│   ├── index.html        # Landing page
│   ├── chat.html         # Chat UI
│   ├── favicon.svg       # Icon
│   └── site.webmanifest  # PWA manifest
├── server.js             # Express server
├── .env                  # Environment variables
└── package.json
```

---

## 🔗 Resources
- [Supabase Docs](https://supabase.com/docs)
- [Resend Docs](https://resend.com/docs)
- [Anthropic API](https://anthropic.com/api)
- [Vercel Deployment](https://vercel.com/docs)

---

**Last Updated:** Nov 2, 2025
**Status:** ✅ Production Ready
