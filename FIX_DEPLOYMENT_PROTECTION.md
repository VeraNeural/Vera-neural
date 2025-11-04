# Fix Vercel Deployment Protection Issue

## Problem
Your Vercel deployment is blocking API calls with "Authentication Required" errors. This is due to **Deployment Protection** being enabled.

## Solution: Disable Deployment Protection

### Steps:

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard

2. **Select your project**
   - Click on: `vera-20251101-fresh`

3. **Go to Settings**
   - Click the `Settings` tab at the top

4. **Find Security section**
   - Scroll down to `Security` 

5. **Disable Deployment Protection**
   - Find "Deployment Protection"
   - Look for the toggle/option
   - **Disable it** OR set to "Only on production for PRs" (less strict)
   - Click "Save"

6. **Redeploy**
   - Go to `Deployments` tab
   - Click the three-dot menu (⋮) on the latest deployment
   - Select `Redeploy`
   - Wait for redeployment

## After You Complete These Steps:

Your API will then work at:
```
https://vera-20251101-fresh-1hf6c3d9o-evas-projects-1c0fe91d.vercel.app/api/auth/send-trial-magic-link
```

And the app will be fully functional at:
```
https://vera-20251101-fresh-1hf6c3d9o-evas-projects-1c0fe91d.vercel.app
```

## Test After Fixing:

1. **Test Magic Link Endpoint:**
   - Visit: `/api/test-env` → Should show all env vars as "✓ SET"
   - Try sending magic link from the app

2. **Test Full Flow:**
   - Enter email → Click "Begin Your Journey"
   - Check email for magic link
   - Click link → Should log in and show trial status
   - Should preserve trial timer (not reset to 48 hours again)
   - Pricing should show $12/month

## Support

If you need more specific instructions, Vercel's docs are here:
https://vercel.com/docs/deployment-protection

---

**Current Live URL:**
```
https://vera-20251101-fresh-1hf6c3d9o-evas-projects-1c0fe91d.vercel.app
```

