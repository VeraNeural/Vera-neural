# 🎯 VERA Testing - Quick Reference Card

## RIGHT NOW - Test the Flow

### URL
👉 **http://localhost:3002**

### The Complete Flow (What You'll See)

```
1️⃣  Landing Page
    └─ You see: Breathing orb, email form
    └─ You do: Enter email + click "Begin Your Journey"

2️⃣  Email Success Message
    └─ You see: "Check your email!" message
    └─ System: Magic link sent to your email

3️⃣  Check Your Email
    └─ You see: Email from support@veraneural.com
    └─ Contains: "Access VERA" button
    └─ You do: Click the button

4️⃣  Verification (Safe Page)
    └─ You see: Verification page loads
    └─ System: Page reads token from URL
    └─ Page: Auto-submits token securely

5️⃣  Chat Interface
    └─ You see: Chat UI with message input
    └─ You do: Type a message like "Hello VERA"

6️⃣  AI Response
    └─ You see: VERA responds to your message
    └─ Message: Saved to database

7️⃣  Persistence
    └─ You do: Refresh the page (F5)
    └─ You see: Previous messages still there! ✅
```

---

## ✅ Success Checklist

Mark these off as they happen:

- [ ] Landing page loads (see orb animation)
- [ ] Enter email and click "Begin Your Journey"
- [ ] See success message "Check your email!"
- [ ] Receive magic link email (~1-3 seconds)
- [ ] Click "Access VERA" button in email
- [ ] Chat interface loads
- [ ] Type and send first message
- [ ] Get AI response (takes ~3-5 seconds)
- [ ] Refresh page
- [ ] Messages still there! ✅

---

## 🔧 Server Info

**Running At:** http://localhost:3002
**Status:** ✅ Ready for testing

**Stop Server:** Press `Ctrl+C` in terminal
**Restart:** `npm run dev`

---

## 📧 Email Setup

**Test Email:** Use any real email address you can access
**Sender:** support@veraneural.com  
**Service:** Resend (configured in .env)

**Where to Check:**
- Gmail: Inbox or Promotions tab
- Outlook: Inbox or Junk
- Any email: Check inbox + spam folder

---

## ⚡ Expected Timings

| Step | Time |
|------|------|
| Landing page load | ~1 second |
| Form submit | ~1 second |
| Email arrives | 1-3 seconds |
| Click link | Instant |
| Chat page loads | 1-2 seconds |
| Send message | ~3-5 seconds for AI response |
| **Total flow** | **~15-20 seconds** |

---

## 🎯 Key Points to Verify

1. **Email Delivery Works**
   - You receive the magic link email
   - Email comes from support@veraneural.com
   - Link is clickable

2. **Magic Link Works**
   - Clicking link doesn't say "invalid"
   - Page loads after clicking
   - You're NOT logged out (stays logged in)

3. **Chat Works**
   - Can type and send messages
   - AI responds quickly
   - Messages appear in chat

4. **Persistence Works**
   - Refresh page with F5
   - Previous messages are still there
   - Conversation continues

---

## 🚨 If Something Doesn't Work

### Issue: "Connection refused"
**Fix:** Make sure `npm run dev` is running
```
Should see: "VERA local server running at http://localhost:3002"
```

### Issue: "Email not received"
**Check:**
- Look in spam/promotions folder
- Wait 3-5 seconds
- Verify `.env` has valid RESEND_API_KEY

### Issue: "Link says invalid/expired"
**Check:**
- Make sure you click (don't copy/paste)
- Token expires in 1 hour
- Try getting a new magic link

### Issue: "Chat not responding"
**Check:**
- Refresh page and try again
- Check `.env` for valid ANTHROPIC_API_KEY
- Anthropic servers might be busy (try again in 30s)

---

## 💾 What Gets Saved

After testing, your data is persisted:

**Database:**
- Your email address
- Your messages
- Your conversation history
- AI responses

**Browser (Local Storage):**
- Auth token
- User preferences

---

## 🎓 What This Tests

✅ Email signup system  
✅ Magic link generation & security  
✅ Email delivery (Resend API)  
✅ Token verification  
✅ Chat interface & functionality  
✅ AI integration (Claude)  
✅ Database persistence (Postgres)  
✅ Conversation management  

---

## 🚀 After Testing

If everything works (which it should!):

1. Test with **different email addresses** (try 2-3)
2. Send **multiple messages** in one conversation
3. **Refresh the page** and verify messages are still there
4. Check **browser console** (F12) for any errors
5. **Ready to deploy to Vercel!**

---

## 📊 Browser DevTools (F12)

**Network Tab:** Watch these requests
- POST `/api/auth/send-trial-magic-link` → 200 OK
- GET `/api/verify` → 200 OK (safe page)
- POST `/api/verify` → 200 OK (token validation)
- POST `/api/chat` → 200 OK (message sent)

**Console Tab:** Look for any errors (red messages)

**Storage Tab:** See your auth token in Local Storage

---

## ⏱️ Timeline

```
0:00  - You click "Begin Your Journey"
0:01  - Success message appears
1:00  - Email arrives in inbox
1:05  - You click email link
1:06  - Chat interface loads
1:10  - You send first message
1:15  - AI responds
1:20  - Test complete! ✅
```

---

## 🎉 Expected Result

After completing the flow, you should have:

✅ A working user account  
✅ A conversation with messages  
✅ Chat history saved in database  
✅ Ability to continue the conversation  
✅ Confidence that the system works end-to-end!

---

**Server:** http://localhost:3002  
**Start Testing:** NOW! 🚀

Good luck! 🌟
