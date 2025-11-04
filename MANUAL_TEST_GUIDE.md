# 🎯 VERA Complete User Flow - Manual Testing Guide

## Server Status ✅
**Server Running At:** http://localhost:3002

---

## 📋 Expected Complete Flow

Here's exactly what should happen when you follow the flow:

### STEP 1: Landing Page
1. Open: **http://localhost:3002**
2. You should see:
   - Breathing purple/blue orb animation
   - "VERA" title
   - "Your AI Co-Regulator" subtitle
   - Email input field
   - "Begin Your Journey" button
   - "48-Hour Free Trial" badge

### STEP 2: Signup Form
1. Enter your email in the input field
   - Example: `yourname@example.com`
2. Click "Begin Your Journey" button
3. You should see:
   - Button becomes disabled: "Sending magic link..."
   - Page shows success message (after ~1 second):
     - ✨ **Check your email!**
     - We've sent you a magic link to start your 48-hour free trial with VERA.
     - Explore VERA VR Vision →
   - Original form disappears

### STEP 3: Receive Magic Link Email
1. Check your email inbox
   - **From:** support@veraneural.com
   - **Subject:** Your VERA login link
2. Look for the email
   - If using Gmail: Check spam/promotions folder if not in inbox
   - Email contains a button: "Access VERA" with clickable link

### STEP 4: Magic Link Verification
1. Click the "Access VERA" button in the email
   - OR click the magic link
   - Link format: `http://localhost:3002/api/verify#token=...`
2. You should see:
   - Browser navigates to verification page
   - Safe verification page loads (takes ~1-2 seconds)
   - Page reads token from URL
   - Page auto-submits token to server
   - Browser redirects automatically

### STEP 5: Chat Interface
1. After verification, browser redirects to: **http://localhost:3002/chat.html**
2. You should see:
   - VERA chat interface
   - Message input box at bottom
   - "Send" button
   - Trial timer showing remaining time
   - Conversation history (empty on first visit)
   - Sample/welcome message from VERA

### STEP 6: Send First Message
1. Type in the message input: `Hello VERA`
2. Click "Send" or press Enter
3. You should see:
   - Your message appears in chat
   - "VERA is thinking..." indicator
   - AI response appears from VERA (takes ~2-5 seconds)
   - Message gets saved to database

### STEP 7: Conversation Persistence
1. Send another message: `Tell me about yourself`
2. Refresh the page (F5 or Cmd+R)
3. You should see:
   - Previous messages still there
   - Conversation history preserved
   - Can continue chatting

---

## 🧪 What Each Endpoint Does

### 1. Signup Endpoint
```
POST http://localhost:3002/api/auth/send-trial-magic-link
Body: { "email": "yourname@example.com" }
Expected: 200 OK with { "success": true, "message": "Magic link sent..." }
```

### 2. Verification Endpoint
```
GET http://localhost:3002/api/verify#token=<token>
Expected: Loads safe HTML page (no prefetch attack)

POST http://localhost:3002/api/verify
Body: { "token": "<token>" }
Expected: 200 OK with { "success": true, "email": "..." }
```

### 3. Chat Endpoint
```
POST http://localhost:3002/api/chat
Body: { 
  "message": "Hello VERA",
  "anonId": "unique-user-id",
  "guestMessageCount": 1
}
Expected: 200 OK with {
  "success": true,
  "response": "AI response here...",
  "conversationId": 1,
  "subscription": { ... }
}
```

---

## ✅ Complete Flow Checklist

Use this to verify each step works:

- [ ] **Step 1:** Landing page loads with orb and form
- [ ] **Step 2:** Email form accepts input and submits
- [ ] **Step 3:** Success message appears after submit
- [ ] **Step 4:** Magic link email arrives in inbox
- [ ] **Step 5:** Clicking email link loads verification page
- [ ] **Step 6:** After verification, redirects to chat
- [ ] **Step 7:** Chat interface loads and is interactive
- [ ] **Step 8:** Can send first message
- [ ] **Step 9:** AI responds to message
- [ ] **Step 10:** Message persists after page refresh

---

## 🐛 Troubleshooting

### "Can't reach server"
- Verify server is running: `npm run dev`
- Check it says "VERA local server running at http://localhost:3002"

### "Email not received"
- Check spam/promotions folder
- Verify `RESEND_API_KEY` in `.env` is valid
- Check Resend dashboard for failed emails

### "Verification link says invalid/expired"
- Make sure you click the link within 1 hour (tokens expire)
- Don't copy/paste - click the link in the email
- Link should look like: `http://localhost:3002/api/verify#token=...`

### "Chat not responding"
- Check if AI API is overloaded (Anthropic issue)
- Try sending message again
- Check `.env` for valid `ANTHROPIC_API_KEY`

### "Messages not saving"
- Verify Postgres connection (check server logs)
- Verify `POSTGRES_URL_NON_POOLING` is correct in `.env`
- Check server log for database errors

---

## 📊 What You're Testing

| Component | What Happens |
|-----------|--------------|
| **Landing Page** | Static HTML + CSS + JS loaded |
| **Signup Form** | Email collected and POSTed to API |
| **Email Service** | Resend API sends magic link |
| **Magic Link** | Token generated and stored in DB |
| **Verification** | Two-step safe verification (GET page + POST token) |
| **Authentication** | User session created after verification |
| **Chat Interface** | Loads after successful verification |
| **Chat Messaging** | Messages sent to AI, response received |
| **Database** | Messages and conversations saved |
| **Persistence** | Conversation history retrieves on page refresh |

---

## 🎯 Expected Timeline

- **Step 1-2 (Landing → Signup):** ~2 seconds
- **Step 3 (Email):** ~1-3 seconds (Resend delivery)
- **Step 4 (Click Link):** Instant
- **Step 5 (Chat Load):** ~1-2 seconds
- **Step 6 (First Message):** ~3-5 seconds (AI thinking)
- **Step 7 (Refresh):** ~2 seconds

**Total flow:** ~15-20 seconds from landing page to first chat message

---

## 🔍 Browser Console Tips

Open browser DevTools (F12) and go to **Console** tab to see:

1. **Network requests:** Go to **Network** tab, you'll see:
   - POST `/api/auth/send-trial-magic-link` - Signup
   - GET `/api/verify` - Verification page
   - POST `/api/verify` - Token verification
   - POST `/api/chat` - Chat messages

2. **Errors:** If anything breaks, errors appear in Console

3. **Local Storage:** Check Application → Local Storage → http://localhost:3002
   - Stores auth token

---

## 📱 What's Stored in Database

After completing the flow:

**users table:**
```
id: 1
email: yourname@example.com
trial_start: 2025-11-02 05:00:00
trial_end: 2025-11-04 05:00:00
subscription_status: trial
```

**conversations table:**
```
id: 1
user_id: 1
title: New conversation
message_count: 2
created_at: 2025-11-02 05:00:00
```

**messages table:**
```
id: 1, user_id: 1, conversation_id: 1, role: user, content: Hello VERA
id: 2, user_id: 1, conversation_id: 1, role: assistant, content: AI response...
```

---

## ✨ Final Verification

After completing all steps, you should be able to:

✅ Sign up with email
✅ Receive magic link email
✅ Click link and get verified
✅ Access chat interface
✅ Send messages to VERA
✅ Get AI responses
✅ See message history persist
✅ Start a conversation that continues

---

## 🎉 Success Indicators

You'll know everything works when:

1. ✅ You see the success message after email submission
2. ✅ You receive the magic link email within 3 seconds
3. ✅ Clicking the link doesn't say "invalid/expired"
4. ✅ Chat interface loads after clicking the link
5. ✅ You can type and send messages
6. ✅ VERA responds to your messages within 5 seconds
7. ✅ Your conversation is still there after refreshing
8. ✅ You can send multiple messages and build a conversation

---

## 🚀 Next Steps

After verifying the complete flow works:

1. **Test with a different email** to verify it works multiple times
2. **Refresh chat page** to verify messages persist
3. **Try different messages** to verify AI responds appropriately
4. **Check browser console** for any errors
5. **Ready to deploy!**

---

**Server:** http://localhost:3002  
**Status:** ✅ Running and ready for testing
**Time to Complete Flow:** ~20 seconds

Happy testing! 🎉
