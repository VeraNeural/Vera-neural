# 📎 VERA File Attachment - Testing Guide

## Quick Start Test (2 minutes)

### Step 1: Open the App
```
https://vera-20251101-fresh-emneeb6yq-evas-projects-1c0fe91d.vercel.app
```

### Step 2: Look for the Attachment Button
Find the 📎 button in the message input area (bottom of screen)

### Step 3: Click and Select a File
- Click 📎
- File picker opens
- Select any file: PDF, image, text, or Word doc
- File should be under 5MB

### Step 4: Watch the Magic
You should see:
1. User message: "📎 Attached: filename (size KB)"
2. Loading indicator appears (dots animating)
3. VERA responds with file-aware message
4. Response saved to history

### Step 5: Open History to See It Saved
- Click 📖 (History button)
- Your file conversation should appear
- Click to reload it

---

## Detailed Testing Scenarios

### Test 1: PDF Upload
**What to test**: PDF handling and VERA response

1. Find a PDF file on your computer (or create one)
2. Keep file under 5MB
3. Click 📎 button
4. Select the PDF
5. **Expected**: 
   - ✅ File message appears
   - ✅ VERA responds with "I've received your PDF..."
   - ✅ Response is saved to database

### Test 2: Image Upload
**What to test**: Image file handling

1. Find an image (JPG, PNG, WebP, GIF)
2. Click 📎 button
3. Select the image
4. **Expected**:
   - ✅ File message shows "📎 Attached: image.jpg"
   - ✅ VERA acknowledges image file
   - ✅ Contextual response about image

### Test 3: Text File Upload
**What to test**: Text document handling

1. Create a simple text file (.txt) or find one
2. Add some text content
3. Click 📎 button
4. Select the .txt file
5. **Expected**:
   - ✅ File appears in chat
   - ✅ VERA recognizes it as text document
   - ✅ Response is text-appropriate

### Test 4: Word Document Upload
**What to test**: Word doc (.docx or .doc) handling

1. Find a Word document
2. Click 📎 button
3. Select the .docx or .doc file
4. **Expected**:
   - ✅ File message displays
   - ✅ VERA responds with "I've received your Word document..."
   - ✅ Type-specific response

### Test 5: File Size Limit
**What to test**: 5MB limit enforcement

1. Create a file larger than 5MB (or find one)
2. Click 📎 button
3. Try to select the large file
4. **Expected**:
   - ✅ Browser alert appears: "File size exceeds 5MB limit"
   - ✅ File is NOT sent to server
   - ✅ Chat remains empty (no upload attempt)

### Test 6: Unsupported File Type
**What to test**: File type filtering

1. Try to select a file type NOT in the accept list
   (e.g., .exe, .zip, .avi - not in accept="image/*,.pdf,.txt,.doc,.docx")
2. **Expected**:
   - ✅ File picker may not show the file
   - OR: File appears but isn't automatically selected
   - ✅ If somehow sent, backend still handles gracefully

### Test 7: Multiple Files in Same Conversation
**What to test**: Sequential attachments

1. Attach first file (PDF)
2. Wait for response
3. Attach second file (image)
4. Wait for response
5. Open History
6. **Expected**:
   - ✅ Both files show in conversation
   - ✅ Both VERA responses present
   - ✅ History shows as single conversation

### Test 8: Guest vs Authenticated User
**What to test**: User handling

1. Upload file WITHOUT logging in (guest mode)
2. **Expected**:
   - ✅ File still uploads
   - ✅ Auto-generates guest user
   - ✅ Response returns normally
   - ✅ Conversation saved to guest history

---

## API Testing (curl commands)

### Test File Upload Endpoint

**Minimal Request**:
```bash
curl -X POST https://vera-20251101-fresh-emneeb6yq-evas-projects-1c0fe91d.vercel.app/api/file-upload \
  -H "Content-Type: application/json" \
  -d '{
    "attachment": {
      "name": "test.pdf",
      "type": "application/pdf",
      "size": 102400
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "response": "I've received your PDF document...",
  "conversationId": "some-uuid",
  "attachment": {
    "name": "test.pdf",
    "type": "application/pdf",
    "size": 102400,
    "processed": true
  }
}
```

### Test with Message + Attachment

```bash
curl -X POST https://vera-20251101-fresh-emneeb6yq-evas-projects-1c0fe91d.vercel.app/api/file-upload \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Please analyze this document",
    "email": "test@example.com",
    "attachment": {
      "name": "report.pdf",
      "type": "application/pdf",
      "size": 204800
    }
  }'
```

### Test Error: Missing Attachment

```bash
curl -X POST https://vera-20251101-fresh-emneeb6yq-evas-projects-1c0fe91d.vercel.app/api/file-upload \
  -H "Content-Type: application/json" \
  -d '{
    "message": "No file attached"
  }'
```

**Expected Response**:
```json
{
  "error": "Attachment required"
}
```

### Test Error: File Too Large

```bash
curl -X POST https://vera-20251101-fresh-emneeb6yq-evas-projects-1c0fe91d.vercel.app/api/file-upload \
  -H "Content-Type: application/json" \
  -d '{
    "attachment": {
      "name": "huge-file.pdf",
      "type": "application/pdf",
      "size": 10485760
    }
  }'
```

**Expected Response**:
```json
{
  "error": "File size exceeds 5MB limit"
}
```

---

## Browser Console Debugging

### Check File Upload Network Call
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click 📎 and upload file
4. Look for request to `/api/file-upload`
5. Click it and check:
   - **Status**: 200 (success) or 400/500 (error)
   - **Request**: Check JSON being sent
   - **Response**: Check server response

### Check Local Storage
1. Open DevTools (F12)
2. Go to Application → Local Storage
3. Look for entries like:
   - `veraTheme` - dark/light setting
   - `veraConversationHistory` - saved conversations
4. Click and expand to see attachment data

### Monitor Console Logs
1. Open DevTools console (F12)
2. Look for messages like:
   ```
   📎 Processing file attachment for user@email: document.pdf
   ```
3. Check for errors if anything fails

---

## Mobile Testing

### On Mobile Browser
1. Open same URL on mobile device
2. Look for 📎 button in input area
3. Click to open mobile file picker
4. Select file from phone
5. **Expected**:
   - ✅ File upload works on mobile
   - ✅ Response displays properly
   - ✅ UI doesn't break on smaller screen
   - ✅ History works on mobile

---

## Verification Checklist

### Frontend Features
- [ ] 📎 Attachment button visible
- [ ] File picker opens on click
- [ ] File size validation works (< 5MB passes)
- [ ] File type filtering works (images, PDFs, docs)
- [ ] User message displays file name/size
- [ ] Loading indicator appears during processing
- [ ] VERA response appears after processing
- [ ] Response is contextual to file type

### Backend Processing
- [ ] Endpoint `/api/file-upload` responds to POST
- [ ] CORS headers present
- [ ] File metadata extracted correctly
- [ ] User lookup/creation works
- [ ] Type-specific context generated
- [ ] VERA response generated successfully
- [ ] Messages saved to database
- [ ] Response includes conversationId

### Database & History
- [ ] Conversation saved to database
- [ ] File metadata preserved
- [ ] VERA response saved
- [ ] History modal shows file conversation
- [ ] Clicking history reloads conversation
- [ ] Delete history works

### Error Handling
- [ ] File > 5MB blocked with alert
- [ ] Invalid MIME type handled gracefully
- [ ] Network error shows user message
- [ ] Database errors caught and logged
- [ ] Meaningful error messages to user

### User Experience
- [ ] Process is quick (< 2 seconds)
- [ ] No console errors
- [ ] UI stays responsive
- [ ] Mobile experience smooth
- [ ] History organized properly
- [ ] Can attach multiple files

---

## Troubleshooting

### Issue: 📎 Button Not Visible
**Solution**:
- Refresh page (Ctrl+R or Cmd+R)
- Clear browser cache
- Try different browser
- Check if JavaScript is enabled

### Issue: File Upload Fails Silently
**Solution**:
- Open DevTools (F12)
- Check Network tab for `/api/file-upload` request
- Look for error status (400, 500)
- Check console for errors
- Try smaller file

### Issue: VERA Response Not Appearing
**Solution**:
- Check Network tab - does request complete?
- Look for server error in response
- Try text file first (simpler to process)
- Check browser console for errors
- Try different file type

### Issue: File Shows in Chat But Not in History
**Solution**:
- Refresh page to reload history from localStorage
- Check browser storage isn't full
- Try deleting old conversations
- Clear browser cache and reload

### Issue: File Size Shows as 0 or Wrong
**Solution**:
- File may be corrupted
- Try different file
- Check file actually exists on disk
- Verify file size with file manager

---

## Performance Testing

### Response Time Expectations
| Scenario | Expected Time |
|----------|---------------|
| Small file (< 1MB) | 500ms - 1s |
| Medium file (1-3MB) | 1-2s |
| Large file (3-5MB) | 2-3s |
| Network latency | +500ms |

### Test Response Times
1. Note timestamp when you click "send" with file
2. Note timestamp when VERA response appears
3. Calculate difference
4. Should be < 3 seconds for most files

---

## Success Criteria

✅ **All tests pass** when:
1. Users can attach files using 📎 button
2. File size validated (< 5MB)
3. File types recognized (image, PDF, text, Word)
4. VERA responds contextually to file type
5. File appears in chat with metadata
6. Conversation saved to history
7. Error messages display for invalid files
8. No console errors in DevTools
9. Mobile experience smooth
10. Process completes within 3 seconds

---

## Support

**If tests fail**, check:
1. Deployment URL is correct
2. Browser is up to date
3. JavaScript is enabled
4. Network connection stable
5. File is valid (not corrupted)
6. File size is under 5MB
7. MIME type is supported

**Files to review**:
- `/api/file-upload.js` - Backend handler
- `/public/vera-pro.html` - Frontend integration
- `API_FILE_ATTACHMENT_CONFIG.md` - Full docs

---

**Ready to test?** 🚀

1. Open: https://vera-20251101-fresh-emneeb6yq-evas-projects-1c0fe91d.vercel.app
2. Click: 📎 button
3. Select: Any file under 5MB
4. See: VERA respond contextually
5. Share: Your feedback!

Happy testing! 🎉
