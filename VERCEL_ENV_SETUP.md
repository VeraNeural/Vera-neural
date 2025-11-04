# Vercel Environment Variables Setup

## ⚠️ CRITICAL: Set these environment variables in Vercel Dashboard

Your Vercel deployment is failing because environment variables are not configured in the Vercel project dashboard.

### Steps to Fix:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/
   - Go to your project: `vera-20251101-fresh`

2. **Open Settings → Environment Variables**
   - Click on your project
   - Go to `Settings` tab
   - Go to `Environment Variables` section

3. **Add ALL these variables:**

```
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=support@veraneural.com
POSTGRES_URL_NON_POOLING=postgres://user:password@host:5432/postgres?sslmode=require
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_PRICE_ID=price_xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
APP_URL=https://your-vercel-url.vercel.app
```

4. **For each variable:**
   - Paste the key name (e.g., `RESEND_API_KEY`)
   - Paste the value
   - Select "All Environments" (Development, Preview, Production)
   - Click "Save"

5. **After adding all variables:**
   - Go to `Deployments`
   - Find the latest deployment
   - Click on the three-dot menu
   - Select "Redeploy"

### Why This Is Needed:

- **RESEND_API_KEY**: Required for sending magic link emails
- **EMAIL_FROM**: Email address emails are sent from
- **POSTGRES_URL_NON_POOLING**: Database connection (Supabase)
- **API Keys**: For Claude, OpenAI, Stripe, ElevenLabs
- **APP_URL**: Base URL for constructing magic link URLs

### Test Environment Variables:

After setting them, visit:
```
https://your-vercel-url/api/test-env
```

You should see: `"RESEND_API_KEY": "✓ SET"` for all keys

---

## Troubleshooting

If you still see 500 errors:

1. **Check Vercel logs:**
   - Go to `Deployments` → Latest deployment
   - Click `Runtime logs`
   - Look for error messages

2. **Redeploy after setting variables:**
   - Sometimes Vercel needs a fresh deployment to pick up env vars
   - Go to `Deployments` → Right-click latest → `Redeploy`

3. **Test individual endpoints:**
   - `/api/test-env` - Shows which env vars are set
   - `/api/auth/send-trial-magic-link` - Should work after env vars are set

---

**Deployment URL:**
```
https://vera-20251101-fresh-1r4rbjgeg-evas-projects-1c0fe91d.vercel.app
```

