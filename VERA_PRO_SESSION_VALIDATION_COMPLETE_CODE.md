# VERA-PRO.HTML - Session Validation & Checkout Redirect Complete Code

## 1. MAIN SESSION VALIDATION FUNCTION (Lines 4559-4705)

### validateSession() - Called on page load and every 5 minutes

```javascript
async function validateSession() {
  try {
    // Parse cookies properly - handle special characters and hex values
    const cookies = {};
    document.cookie.split('; ').forEach(c => {
      const [key, ...valueParts] = c.split('=');
      if (key && valueParts.length > 0) {
        cookies[key] = valueParts.join('='); // In case value contains '='
      }
    });
    
    const userEmail = cookies.session_email || localStorage.getItem('userEmail');
    const sessionToken = cookies.session_token; // Get the session token from cookie (hex string)
    const trialEnd = cookies.trial_end || localStorage.getItem('trialEnd');
    
    console.log('[validateSession] Cookies found:', {
      hasSessionEmail: !!cookies.session_email,
      hasSessionToken: !!cookies.session_token,
      sessionTokenLength: sessionToken?.length || 0
    });
    
    if (!userEmail) {
      console.warn('⚠️ No session email found - redirecting to checkout');
      window.location.href = '/checkout?reason=no_session';
      return false;
    }

    if (!sessionToken) {
      console.warn('⚠️ No session token found - redirecting to checkout');
      console.warn('📋 Available cookies:', Object.keys(cookies));
      window.location.href = `/checkout?email=${encodeURIComponent(userEmail)}&reason=no_session_token`;
      return false;
    }
    
    console.log('[validateSession] Sending validation request with:', {
      email: userEmail,
      tokenLength: sessionToken.length,
      action: 'validate'
    });
    
    // Validate session with server
    const response = await fetch('/api/auth/validate-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        sessionToken: sessionToken,
        action: 'validate'
      }),
      credentials: 'include' // Include cookies in request (for other auth headers)
    });
    
    const data = await response.json();
    
    console.log('[validateSession] Response from server:', {
      valid: data.valid,
      status: response.status,
      error: data.error
    });
    
    if (!data.valid) {
      console.warn('❌ Session validation failed:', data.error);
      localStorage.removeItem('userEmail');
      localStorage.removeItem('trialEnd');
      window.location.href = `/checkout?email=${userEmail}&reason=${encodeURIComponent(data.error || 'Session expired')}`;
      return false;
    }
    
    // Update localStorage with current session info
    localStorage.setItem('userEmail', userEmail);
    localStorage.setItem('trialEnd', data.trialEnd || trialEnd);
    
    // Update trial badge if trial is active
    if (data.trial && data.trialEnd) {
      updateTrialBadge(data.trialEnd);
    }
    
    console.log(`✅ Session valid for ${userEmail}`, {
      trial: data.trial,
      subscription_status: data.subscription_status
    });
    
    return true;
  } catch (error) {
    console.error('❌ Session validation error:', error);
    // Don't redirect on network error - allow offline access
    return true;
  }
}

// Called on page load
validateSession();

// Called every 5 minutes
setInterval(validateSession, 5 * 60 * 1000);
```

---

## 2. CHECKOUT REDIRECTS IN validateSession()

### ❌ REDIRECT #1: No Session Email (Line 4582)
```javascript
if (!userEmail) {
  console.warn('⚠️ No session email found - redirecting to checkout');
  window.location.href = '/checkout?reason=no_session';
  return false;
}
```

### ❌ REDIRECT #2: No Session Token (Line 4589)
```javascript
if (!sessionToken) {
  console.warn('⚠️ No session token found - redirecting to checkout');
  console.warn('📋 Available cookies:', Object.keys(cookies));
  window.location.href = `/checkout?email=${encodeURIComponent(userEmail)}&reason=no_session_token`;
  return false;
}
```

### ❌ REDIRECT #3: Server Validation Failed (Line 4623)
```javascript
if (!data.valid) {
  console.warn('❌ Session validation failed:', data.error);
  localStorage.removeItem('userEmail');
  localStorage.removeItem('trialEnd');
  window.location.href = `/checkout?email=${userEmail}&reason=${encodeURIComponent(data.error || 'Session expired')}`;
  return false;
}
```

---

## 3. TRIAL TIMER & REDIRECT (Lines 5235-5245)

### Called when trial countdown reaches 0

```javascript
const now = new Date();
const diffMs = trialEndTime - now;

if (diffMs <= 0) {
  // Trial expired
  clearInterval(trialTimerInterval);
  redirectToUpgrade();  // ❌ REDIRECTS TO CHECKOUT
  return;
}
```

---

## 4. redirectToUpgrade() Function (Lines 5453-5458)

### Called when trial expires

```javascript
function redirectToUpgrade() {
  // Trial expired - redirect to upgrade/checkout
  const userEmail = localStorage.getItem('userEmail') || '';
  const userPhone = localStorage.getItem('userPhone') || '';
  const checkoutUrl = `/checkout?email=${encodeURIComponent(userEmail)}&phone=${encodeURIComponent(userPhone)}&expired=true`;
  window.location.href = checkoutUrl;
}
```

---

## 5. goToCheckout() Function (Lines 4782-4797)

### Called when user clicks "Upgrade" button or plan selection

```javascript
function goToCheckout(plan) {
  const userEmail = localStorage.getItem('userEmail') || '';
  const userPhone = localStorage.getItem('userPhone') || '';
  
  if (!userEmail) {
    alert('Please sign in first to upgrade');
    return;
  }

  // Close settings modal
  closeModal('settingsModal');

  // Redirect to checkout with plan
  const checkoutUrl = `/checkout?email=${encodeURIComponent(userEmail)}&phone=${encodeURIComponent(userPhone)}&plan=${plan}`;
  window.location.href = checkoutUrl;
}

function openCheckout() {
  goToCheckout('monthly');
}
```

---

## SUMMARY: All Checkout Redirects

| Line | Trigger | Reason |
|------|---------|--------|
| 4582 | `validateSession()` | No `session_email` cookie found |
| 4589 | `validateSession()` | No `session_token` cookie found |
| 4623 | `validateSession()` | Server returned `data.valid = false` |
| 5242 | Trial timer | Trial countdown reached 0 (expired) |
| 4797 | `goToCheckout()` | User clicked upgrade/plan button |
| 5458 | `redirectToUpgrade()` | Trial expired (called from timer) |

---

## KEY ISSUE: Why You're Stuck in Checkout Loop

The problem is likely **one of these three scenarios**:

### Scenario 1: Cookies Not Being Parsed
- Session cookies ARE being set by the server
- BUT `document.cookie.split('; ')` is failing to parse them correctly
- Result: `sessionToken` is undefined
- Action: Redirect to checkout (line 4589)

### Scenario 2: Server Validation Returning Invalid
- Cookies ARE being parsed and sent to `/api/auth/validate-session`
- BUT the server returns `{valid: false, error: "..."}`
- Result: Redirect to checkout (line 4623)

### Scenario 3: Cookies Not Being Sent with Request
- Cookies exist in browser
- BUT `fetch(..., {credentials: 'include'})` isn't sending them
- Server can't find the session
- Result: Redirect to checkout (line 4623)

---

## HOW TO DEBUG

Open DevTools (F12) and check Console logs for:

```
[validateSession] Cookies found: {
  hasSessionEmail: true/false,
  hasSessionToken: true/false,
  sessionTokenLength: 64 (should be)
}

[validateSession] Sending validation request with: {
  email: "...",
  tokenLength: 64,
  action: "validate"
}

[validateSession] Response from server: {
  valid: true/false,
  status: 200/401/400,
  error: "..."
}
```

If you see:
- `hasSessionToken: false` → Cookies not parsing correctly
- `valid: false` → Server validation failed
- `valid: true` → Everything is working!

