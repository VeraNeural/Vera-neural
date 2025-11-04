# COMPLETE USER ONBOARDING FLOW - NOW LIVE! 🚀

## Journey Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    VERA ONBOARDING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. USER LANDS ON veraneural.com
   ↓
   📍 Location: /index.html (Landing Page)
   ✨ Shows:
      - "I am VERA" introduction (8 seconds)
      - Dark transition with words (7 seconds)
      - Interactive glowing orb
   🎯 Action: User clicks orb or waits 15 seconds

2. WELCOME SCREEN APPEARS
   ↓
   📍 Location: /index.html (Welcome overlay)
   ✨ Shows:
      - "I am VERA - Your AI Companion"
      - "I am so glad you are finally here"
      - Two CTA buttons
   🎯 Action: User clicks "Start Free Trial"

3. EMAIL SIGNUP PAGE
   ↓
   📍 Location: /signup-email.html
   ✨ Shows:
      - Beautiful gradient form
      - Email input field
      - "Send Magic Link" button
      - Feature highlights
   🎯 Action: User enters email → clicks button

4. BACKEND: MAGIC LINK GENERATED
   ↓
   📍 Endpoint: POST /api/auth/send-trial-magic-link
   ✨ Does:
      - Validates email
      - Generates 64-char hex token
      - Stores in magic_links table with 24h expiration
      - Sends email with magic link via Resend API
   📧 Email Sent:
      - From: VERA <noreply@veraneural.com>
      - Subject: ✨ Your VERA 48-Hour Trial Magic Link
      - Contains: Magic link URL

5. USER RECEIVES EMAIL
   ↓
   📍 Email: User's inbox
   ✨ Shows:
      - "Start Your Trial" button
      - Link: /api/auth/verify-trial-link?token=abc123...
   🎯 Action: User clicks link

6. BACKEND: VERIFY & ACTIVATE TRIAL
   ↓
   📍 Endpoint: GET /api/auth/verify-trial-link?token=...
   ✨ Does:
      ✅ Verify token exists and is valid
      ✅ Mark token as used (prevent reuse)
      ✅ Check if user exists
         - If NO: Create new user in database
         - If YES: Check if trial expired
      ✅ Assign/extend 48-hour trial (trial_end = NOW + 48h)
      ✅ Create session in database
         - Generate 32-byte hex session token
         - Set expires_at = NOW + 7 days
         - Store user_id + token in sessions table
      ✅ Set HTTP cookies:
         - session_token=abc123... (Secure; SameSite=Lax)
         - session_email=user@email.com (Secure; SameSite=Lax)
      ✅ Generate HTML redirect to vera-pro.html
      ✅ Use meta-refresh (not HTTP 302) for redirect
   🔄 Redirect to:
      /vera-pro.html?email=user@email.com&subscription_status=trial

7. VERA PRO APP LOADS
   ↓
   📍 Location: /vera-pro.html
   ✨ Does:
      - Browser reads cookies automatically
      - JavaScript calls validateSession()
      - validateSession() extracts cookies:
         * session_email from cookie
         * session_token from cookie (hex string)
      - Sends POST to /api/auth/validate-session:
         {
           "email": "user@email.com",
           "sessionToken": "abc123...",
           "action": "validate"
         }

8. BACKEND: VALIDATE SESSION
   ↓
   📍 Endpoint: POST /api/auth/validate-session
   ✨ Does:
      ✅ Check if session token exists in database
      ✅ Verify session hasn't expired
      ✅ Query user data (includes trial_end)
      ✅ Check if trial is still valid:
         - Get trial_end from database
         - Compare with current time
         - If NOW < trial_end: Trial ACTIVE ✅
         - If NOW > trial_end: Trial EXPIRED ❌
      ✅ Return response:
         {
           "valid": true,
           "trial": true,
           "trialEnd": "2025-11-05T12:00:00Z",
           "subscription_status": "trial"
         }

9. VERA PRO SHOWS CHAT
   ↓
   📍 Location: vera-pro.html
   ✨ Shows:
      ✅ Chat interface
      ✅ Trial countdown badge (top-right):
         "⏱️ 47h 32m left"
      ✅ User can start chatting immediately
      ✅ All VERA features available during trial

10. AFTER 48 HOURS
    ↓
    📍 Auto-check: Every 5 minutes validateSession runs
    ✨ When trial expires:
       - Backend returns valid: false
       - Frontend redirects to /checkout?expired=true
       - User can upgrade to paid plan

```

---

## Files in This Flow

### 1. Frontend Pages
- **`/index.html`** - Landing page with intro sequence
- **`/signup-email.html`** - Email entry for trial
- **`/vera-pro.html`** - Main chat application

### 2. Backend APIs
- **`POST /api/auth/send-trial-magic-link`** - Generate and email magic link
- **`GET /api/auth/verify-trial-link?token=...`** - Verify link, create user, create session
- **`POST /api/auth/validate-session`** - Validate session and check trial status

### 3. Database Tables
- **`magic_links`** - Stores magic link tokens with expiration
- **`users`** - User records with trial_end date
- **`sessions`** - Active sessions with tokens and expiration

---

## Key Technical Details

### ✅ Session Tokens (NOT HttpOnly)
```javascript
// In verify-trial-link.js:
res.setHeader('Set-Cookie', [
  `session_token=${sessionToken}; Secure; SameSite=Lax; Max-Age=604800; Path=/`,
  `session_email=${email}; Secure; SameSite=Lax; Max-Age=604800; Path=/`
]);
// HttpOnly removed so JavaScript can read tokens
```

### ✅ Cookie Parsing (Proper handling of hex values)
```javascript
// In vera-pro.html validateSession():
const cookies = {};
document.cookie.split('; ').forEach(c => {
  const [key, ...valueParts] = c.split('=');
  cookies[key] = valueParts.join('='); // Handles '=' in hex values
});

const sessionToken = cookies.session_token; // Gets the 64-char hex token
```

### ✅ Trial Expiration Check (Explicit validation)
```javascript
// In validate-session.js checkTrialStatus():
const trialEnd = new Date(user.trial_end);
const now = new Date();

if (now < trialEnd) {
  return { trialActive: true, trialEnd: user.trial_end };
}
return { trialActive: false, trialEnd: user.trial_end };
```

### ✅ Trial Badge (Updates every minute)
```javascript
// In vera-pro.html updateTrialTimer():
const hours = Math.floor(diffMs / (1000 * 60 * 60));
const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
badgeText.textContent = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
```

---

## Testing the Flow

### Manual Test Steps:

1. **Visit Landing Page**
   ```
   https://veraneural.com
   ```
   ✅ Should see VERA introduction sequence
   ✅ After 15 seconds, see interactive orb
   ✅ Click orb to show welcome screen

2. **Click "Start Free Trial"**
   ```
   Redirects to: https://veraneural.com/signup-email.html
   ```
   ✅ Should see email entry form
   ✅ Enter your test email

3. **Submit Email**
   ```
   Click: "Send Magic Link"
   ```
   ✅ Should see "Magic link sent to your@email.com"
   ✅ Check your inbox for email from VERA

4. **Click Magic Link in Email**
   ```
   Link format: https://veraneural.com/api/auth/verify-trial-link?token=abc123...
   ```
   ✅ Should see "Activating your VERA trial..." loading screen
   ✅ After 1-2 seconds, redirected to vera-pro.html
   ✅ Should be logged in to chat app

5. **Check Trial Badge**
   ```
   Top-right corner of vera-pro.html
   ```
   ✅ Should see countdown: "⏱️ 47h 32m"
   ✅ Updates every minute

6. **Check Backend Logs (Vercel)**
   ```
   Look for:
   - "[validateSession] Cookies found: {hasSessionEmail: true, hasSessionToken: true}"
   - "[validateSession] ✅ Session valid for user@email.com"
   - "🕐 Trial Check: Trial ACTIVE for user@email.com"
   ```

---

## Success Indicators ✅

- [x] Landing page shows intro sequence
- [x] Welcome screen appears after sequence
- [x] Click leads to signup-email.html
- [x] Email submission creates magic link
- [x] Magic link sent to inbox
- [x] Clicking link creates user + trial + session
- [x] vera-pro.html loads with user logged in
- [x] Trial countdown badge shows
- [x] Chat is fully functional
- [x] Session cookies are set and readable
- [x] Trial validation works on backend

---

## Commit History

- `a3ff2d5` - Remove HttpOnly from session_token cookie
- `3c4ac66` - Fix trial badge countdown display
- `637f6bb` - Add explicit trial expiration validation
- `af82430` - Landing page with intro sequence
- `9918f59` - Create signup-email.html for trial flow

---

## Next Steps

1. ✅ Test complete flow end-to-end
2. ✅ Monitor Vercel logs for errors
3. ✅ Verify emails arrive correctly
4. ✅ Check session cookies in browser DevTools
5. ✅ Confirm trial countdown works

**Everything is now live!** 🚀
