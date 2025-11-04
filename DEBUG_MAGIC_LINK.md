# 🔍 Magic Link "Invalid or Expired" - Diagnostic & Fix

## Problem

You're seeing "Link expired or invalid" when clicking the magic link. This means the token isn't being found in the database.

## Root Cause Analysis

The issue is likely one of these:

### 1. **Token Already Used** (Most Common)
- Token was verified once successfully
- You tried clicking the same link again
- **Solution:** Get a new magic link by entering your email again

### 2. **Token Expired**
- Magic link tokens expire after **1 hour**
- **Solution:** Request a new magic link

### 3. **Token Not Found in Database**
- Token wasn't saved when the magic link was generated
- **Solution:** Check server logs for errors

### 4. **Double URL Encoding**
- Token might be getting URL-encoded twice
- **Solution:** Add validation in token parsing

---

## How the Flow Should Work

```
1. User signs up
   ↓
2. Token generated: abc123def456...
   ↓
3. Token saved to database: magic_links table
   ↓
4. Email sent with link: http://localhost:3002/api/verify#token=abc123def456...
   ↓
5. User clicks link
   ↓
6. Verification page loads (GET request)
   ↓
7. JavaScript reads token from URL hash: #token=...
   ↓
8. JavaScript POSTs token to /api/verify
   ↓
9. Server looks up token in database
   ↓
10. If found and not expired and not used → Mark as used → Redirect to chat
    If not found → Show "invalid/expired" error
```

---

## Debugging Steps

### Step 1: Check Server Logs

When you click the magic link, watch the server terminal. You should see logs like:

```
[verify GET] URL: /api/verify?...
[verify GET] Hash will be read client-side from URL fragment
[verify] Looking up token: abc123def456...
[verify] Token found! Email: yourname@example.com
```

If you see:
```
[verify] Token NOT found in database
```

Then the token wasn't saved correctly.

### Step 2: Check Browser Console

Open browser DevTools (F12) → Console tab:

```
1. Page loads
2. Check for JavaScript errors
3. Watch network requests:
   - POST /api/verify should return 200 OK
   - Response should show: { success: true, email: "...", userId: ... }
```

### Step 3: Check if Token Was Already Used

If you see in browser console:
```
fetch POST /api/verify returns 400 with: { success: false, error: 'Invalid or expired token' }
```

This likely means:
- The token was already marked as used (you clicked the link before)
- The token expired (1 hour passed)
- The token wasn't saved to database

---

## Quick Fix

### Solution 1: Try Fresh Magic Link

1. Go back to: http://localhost:3002
2. Click "Back to VERA" button
3. Enter your email again
4. Click "Begin Your Journey"
5. Get fresh magic link email
6. Click the NEW link

### Solution 2: Check if Email Works

The "Resend link" button on the error page should work:

```
1. You see error page
2. You see "Resend to [your-email]" button
3. Click it
4. New magic link email arrives
5. Click NEW link
```

### Solution 3: Manual Email Entry

If you don't have the saved email:

```
1. Error page shows email input
2. Enter your email
3. Click "Send link"
4. New magic link email arrives
5. Click the link
```

---

## Technical Details

### Magic Link Generation (auth.js)

```javascript
const token = crypto.randomBytes(32).toString('hex');  // "abc123..."
const expiresAt = new Date(now + 1 hour);               // Expires in 1 hour
await createMagicLink(email, token, expiresAt);          // Save to DB
await sendMagicLink(email, token, baseUrl);              // Send email
```

### Magic Link Email (auth.js)

```html
<a href="http://localhost:3002/api/verify#token=abc123...">Access VERA</a>
```

**Note:** Token is in URL **fragment** (#) not query (?) to prevent email scanner prefetch.

### Token Lookup (database.js)

```sql
SELECT * FROM magic_links 
WHERE token = $1 
  AND expires_at > NOW() 
  AND used = false
```

If any of these fail, token is not found:
- Token doesn't match
- Expires at is in the past
- Token already marked as used

---

## Verification Checklist

- [ ] Email arrives with magic link
- [ ] Link in email contains `#token=...` (not `?token=...`)
- [ ] Clicking link loads verification page
- [ ] Verification page says "Verifying..."
- [ ] After ~1 second, either:
  - ✅ Redirects to chat (success)
  - ❌ Shows "Link expired or invalid" (needs troubleshooting)
- [ ] If error shows, try "Resend" button or go back for fresh link

---

## Common Issues

### "Keeps saying invalid even with fresh link"
→ Check server logs for database connection errors

### "Email never arrives"
→ Check:
- RESEND_API_KEY in .env is valid
- Check spam/promotions folder
- Wait 3-5 seconds
- Try getting a NEW link

### "Link works once, but clicking again says invalid"
→ This is correct behavior!
- Tokens are single-use
- Get a fresh link each time

### "Verification page is blank"
→ Check browser console (F12) for JavaScript errors

---

## Server Logging

I've added debug logging to the verification endpoint. When you test, you'll see in server terminal:

```
[verify GET] URL: /api/verify?something...
[verify GET] Hash will be read client-side from URL fragment
[verify] Looking up token: f1e454e56f642b15f7b5...
[verify] Token found! Email: yourname@example.com
[verify] User found: 42
```

Or if there's an issue:

```
[verify] Token NOT found in database. Token: f1e454e56f642b15f7b5...
```

---

## What to Do Now

### Option 1: Try Fresh Link (Recommended)

1. Stop clicking the old link
2. Go to http://localhost:3002
3. Enter your email again
4. Get brand new magic link
5. Click it immediately (before it's marked as used)

### Option 2: Clear Browser Storage & Try Again

```javascript
// Open DevTools console and run:
localStorage.clear();
sessionStorage.clear();
// Then refresh page
```

### Option 3: Check Server Logs

When you click the link, watch the server terminal for debug output. If you see:
```
[verify] Token NOT found in database
```

Then there's a database issue we need to fix.

---

## Next Steps

1. **Try getting a fresh magic link** from http://localhost:3002
2. **Click it immediately** (don't wait)
3. **Check browser console** for any errors (F12)
4. **Check server terminal** for debug logs
5. **Report what you see**

If it still doesn't work, we'll implement:
- Better token logging
- Token validation/debugging
- Database verification script
- Enhanced error messages

---

**Status:** Debugging in progress  
**Server:** Running at http://localhost:3002  
**Debug Logging:** ✅ Enabled  

Try a fresh flow and let me know what the server logs show!
