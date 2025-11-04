# 🎵 ELEVEN LABS TTS INTEGRATION - SETUP GUIDE

## ✅ What We Just Added

**Integration:** Eleven Labs API with professional voice IDs  
**Status:** Ready for deployment (needs API key)

---

## 🎯 The Three Voices (Eleven Labs Voice IDs)

### 1. 🧘 CALM - Bella
```
Voice ID: EXAVITQu4vr4xnSDxMaL
Characteristics: Soothing, gentle, therapeutic
Best for: Relaxation, check-ins, grounding
Pitch: Lower (calming)
Speed mapping: Slow = more clarity, Fast = less stability
```

### 2. 🤍 WARM - George
```
Voice ID: IKne3meq5aSrNqFWHnkJ
Characteristics: Friendly, natural, supportive
Best for: Daily conversations, encouraging
Pitch: Normal (natural)
Speed mapping: Slow = steady, Fast = energetic
```

### 3. 💼 PROFESSIONAL - Callum
```
Voice ID: pNInz6obpgDQGcFmaJgB
Characteristics: Clear, formal, authoritative
Best for: Important messages, clear instructions
Pitch: Higher (authoritative)
Speed mapping: Slow = articulate, Fast = crisp
```

---

## 🔑 STEP 1: Get Your Eleven Labs API Key

### Option A: Free Trial (Starts Immediately)
1. Go to https://elevenlabs.io
2. Click "Sign Up"
3. Create account with email
4. Verify email
5. Go to Dashboard → "API Keys"
6. Copy your API key
7. Get 10,000 free characters/month

### Option B: Paid Plan (More Characters)
1. Start free trial first
2. Add payment method when ready
3. Upgrade to plan with more characters
4. Plans start at $5/month

### Your Free Characters:
- 10,000 characters/month free
- Average response: 100-300 characters
- Supports: ~30-100 conversations per month

---

## 🔐 STEP 2: Add API Key to vera-pro.html

### Location: Line ~3418 in vera-pro.html

Find this line:
```javascript
'xi-api-key': 'sk-1234567890abcdef'  // ← REPLACE WITH YOUR KEY
```

Replace with your actual API key:
```javascript
'xi-api-key': 'sk_xxxxxxxxxxxxxxxxxxxxxxxx'
```

### Example:
```javascript
'xi-api-key': 'sk_abc123def456ghi789jkl'  // Your real key here
```

### Security Note:
⚠️ **WARNING:** This exposes your API key in frontend code!

**Better Solution (For Production):**
Create a backend endpoint `/api/tts-eleven` that:
1. Receives text from frontend
2. Calls Eleven Labs on backend with API key
3. Returns audio blob to frontend
4. Frontend plays audio

For now, frontend key works for testing, but move to backend later.

---

## 🚀 STEP 3: Test It Out

### Local Testing:
1. Get your Eleven Labs API key
2. Add it to vera-pro.html (line ~3418)
3. Save file
4. Open http://localhost:3000
5. Send message to VERA
6. VERA responds
7. **Listen for Eleven Labs voice!** 🎵

### What You'll Hear:
- Professional AI voice (not browser default)
- Smoother, more natural speech
- Better pronunciation
- Matches selected tone (calm/warm/professional)
- Respects speed setting

---

## 🎚️ How Speed & Tone Map to Eleven Labs

### Speed Settings
```
Slow:      stability=0.75, similarity=0.75  (more stable, clear)
Normal:    stability=0.50, similarity=0.50  (balanced)
Fast:      stability=0.30, similarity=0.25  (less stable, faster)
```

### Tone Settings (Voice IDs)
```
Calm:           EXAVITQu4vr4xnSDxMaL (Bella)
Warm:           IKne3meq5aSrNqFWHnkJ (George)
Professional:   pNInz6obpgDQGcFmaJgB (Callum)
```

---

## 📊 Code Changes Made

### 1. speakMessage() Function Updated
**Before:** Used browser Web Speech API  
**After:** Uses Eleven Labs API with voice IDs

**Changes:**
- Fetch request to Eleven Labs API
- Voice ID selection based on tone
- Stability/clarity settings based on speed
- Automatic fallback to Web Speech if Eleven Labs fails
- Audio blob handling with volume control

### 2. Added currentAudioPlayback Variable
Tracks currently playing audio for:
- Stopping previous audio
- Volume control
- Cleanup after playback

### 3. Added Fallback Function
If Eleven Labs request fails:
- Automatically falls back to Web Speech API
- Users still hear VERA speak (browser voice)
- No interruption to user experience

---

## 🔄 How It Works Now

```
User sends message
  ↓
VERA responds with text
  ↓
addMessage('vera', response) called
  ↓
speakMessage(response) triggered
  ↓
1. Check if TTS enabled
2. Get voice ID based on tone (calm/warm/professional)
3. Map speed to stability/clarity settings
4. Create Eleven Labs API request
5. Send to Eleven Labs with API key
6. Get audio blob back
7. Create Audio object from blob
8. Set volume from user setting
9. Add event handlers (play, end, error)
10. Play audio
11. Show indicator: 🔊 "VERA speaking"
12. Animate waves while playing
13. When done, hide indicator and clean up
  ↓
User hears: Eleven Labs voice with their settings!
```

---

## ✅ Setup Checklist

### Get API Key
- [ ] Go to https://elevenlabs.io
- [ ] Sign up/log in
- [ ] Get API key from dashboard
- [ ] Copy key to clipboard

### Add to Code
- [ ] Open vera-pro.html in editor
- [ ] Find line ~3418 with 'xi-api-key'
- [ ] Replace placeholder with real key
- [ ] Save file

### Test
- [ ] Open http://localhost:3000
- [ ] Enable TTS in Settings
- [ ] Send message to VERA
- [ ] Listen for voice
- [ ] Try different speeds/tones
- [ ] Verify volume control works

### Deploy
- [ ] Run: `npm run deploy`
- [ ] Test on production URL
- [ ] Monitor Eleven Labs usage
- [ ] Enjoy! 🎉

---

## 📈 Monitoring Usage

### Check Eleven Labs Dashboard:
1. Go to https://elevenlabs.io/app/usage
2. See characters used this month
3. Compare to your limit
4. Alerts at 80% and 100%

### Approximate Costs:
- **Free:** 10,000 chars/month
- **Starter:** 100,000 chars/month - $5/month
- **Pro:** 500,000 chars/month - $99/month

### Character Count Example:
- "Hello, how are you?" = 20 characters
- Average VERA response = 100-300 characters
- ~30-100 conversations = 10,000 characters

---

## 🆘 Troubleshooting

### Issue: "401 Unauthorized"
- **Cause:** API key invalid or expired
- **Fix:** Double-check key, regenerate if needed

### Issue: "429 Too Many Requests"
- **Cause:** Rate limit exceeded
- **Fix:** Wait 60 seconds, then try again

### Issue: "No Audio Heard"
- **Cause:** API key missing or invalid
- **Fix:** Add API key and verify it works
- **Fallback:** Will use browser voice automatically

### Issue: "Wrong Voice Tone"
- **Cause:** Voice ID mapping incorrect
- **Fix:** Check voice ID list above, verify all 3 are correct

### Issue: "Speed Doesn't Match"
- **Cause:** Speed settings for Eleven Labs need tuning
- **Fix:** Adjust stability/similarity values in speakMessage()

---

## 🔐 Security Best Practices

### Current (For Development):
✅ API key in frontend code
✅ Works for testing
❌ Not secure for production

### Recommended (For Production):
✅ API key on backend only
✅ Frontend calls `/api/tts-eleven` endpoint
✅ Backend handles Eleven Labs API
✅ Frontend receives audio blob
✅ Secure and scalable

**To Implement Backend:**
1. Create `/api/tts-eleven.js` endpoint
2. Receive text from frontend
3. Call Eleven Labs with backend API key
4. Stream audio blob back to frontend
5. Frontend plays audio

---

## 📝 Next Steps

### Immediate:
1. ✅ Get Eleven Labs API key
2. ✅ Add to vera-pro.html
3. ✅ Test locally
4. ✅ Deploy to production

### Short Term:
1. Monitor usage and costs
2. Gather user feedback on voice quality
3. Consider different voice options
4. Track which voice is preferred

### Long Term:
1. Move API key to backend (security)
2. Add more voice options
3. Add voice preview feature
4. Integrate voice quality feedback
5. Optimize cost per character

---

## 🎯 Summary

**What:** Eleven Labs TTS integration with 3 professional voices  
**Why:** Better audio quality, more natural speech, professional voices  
**Where:** vera-pro.html speakMessage() function  
**Setup:** Get API key, add to code, deploy  
**Cost:** Free 10k chars/month, or paid plans  
**Voices:** Bella (calm), George (warm), Callum (professional)

---

## 🚀 You're Ready!

1. Get your Eleven Labs API key
2. Add it to line ~3418 in vera-pro.html
3. Save and deploy
4. Users hear professional VERA voice! 🎵

**The setup is complete. Just need the API key to activate!** ✨
