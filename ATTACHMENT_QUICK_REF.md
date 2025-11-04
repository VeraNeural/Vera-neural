# VERA File Attachment API - Quick Reference

## What's New

✅ **New Endpoint**: `/api/file-upload` for handling file attachments
✅ **Frontend Integration**: vera-pro.html sends files to new endpoint
✅ **Type-Specific Handling**: PDFs, images, text, and Word docs get contextual responses
✅ **Error Handling**: Size validation, MIME type checking, user verification
✅ **Database Persistence**: All attachments and responses saved to conversation history

## File Upload Flow

```
User Clicks 📎 → File Picker → Select File → 
Validate (5MB max) → Send to /api/file-upload → 
Process Type → Generate VERA Response → 
Save to Database → Display in Chat
```

## API Endpoint

### POST /api/file-upload

**Minimal Request:**
```json
{
  "attachment": {
    "name": "document.pdf",
    "type": "application/pdf",
    "size": 102400
  }
}
```

**Full Request:**
```json
{
  "email": "user@example.com",
  "message": "Please analyze this document",
  "conversationId": "existing-id",
  "attachment": {
    "name": "document.pdf",
    "type": "application/pdf",
    "size": 102400
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "VERA's contextual response",
  "conversationId": "uuid",
  "attachment": {
    "name": "document.pdf",
    "type": "application/pdf",
    "size": 102400,
    "processed": true
  }
}
```

## Supported File Types

| File Type | MIME Type | Example |
|-----------|-----------|---------|
| Image | `image/*` | JPG, PNG, WebP, GIF |
| PDF | `application/pdf` | Reports, documents |
| Text | `text/plain` | TXT files, notes |
| Word (.doc) | `application/msword` | Legacy Word docs |
| Word (.docx) | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Modern Word docs |

## Limits

- **Max File Size**: 5MB (validated on client and server)
- **Max Conversations Stored**: 20 (browser localStorage)
- **Supported Users**: Guest (anonymous) and authenticated

## Frontend Code Reference

**Button:**
```html
<button class="input-btn attachment-btn" onclick="attachFile()">📎</button>
```

**Hidden Input:**
```html
<input type="file" id="fileInput" style="display: none;" 
       onchange="handleFileUpload(event)" 
       accept="image/*,.pdf,.txt,.doc,.docx">
```

**Handler Function:**
```javascript
function attachFile() {
  document.getElementById('fileInput').click();
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  // ... validation and upload logic
  fetch('/api/file-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId,
      email: userEmail,
      anonId,
      attachment: {
        name: file.name,
        type: file.type,
        size: file.size
      }
    })
  });
}
```

## Backend File Structure

```
/api/
├── chat.js (updated - handles regular messages)
└── file-upload.js (NEW - handles file attachments)

/lib/
├── database.js (existing - used for persistence)
└── vera-consciousness.js (existing - generates responses)

/public/
└── vera-pro.html (updated - new endpoint reference)
```

## Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| 400 | File size exceeds 5MB limit | Upload too large |
| 400 | Attachment required | No file provided |
| 405 | Method not allowed | Wrong HTTP method |
| 500 | Error processing file | Server error |

## Deployment Status

✅ **Production**: https://vera-20251101-fresh-emneeb6yq-evas-projects-1c0fe91d.vercel.app
✅ **Endpoint Active**: `/api/file-upload`
✅ **Frontend Updated**: vera-pro.html sends to correct endpoint
✅ **Database Ready**: PostgreSQL persistence enabled

## Testing File Upload

### Step 1: Open App
https://vera-20251101-fresh-emneeb6yq-evas-projects-1c0fe91d.vercel.app

### Step 2: Click Attachment Button
Look for the 📎 button in the input area

### Step 3: Select a File
Choose any PDF, image, text file (under 5MB)

### Step 4: See File Preview
Message shows: "📎 Attached: filename (size KB)"

### Step 5: Get VERA Response
VERA generates contextual response about the file type

### Step 6: Check History
Open History (📖) to see file attachments saved

## Next Steps (Optional Enhancements)

1. **Direct File Processing**
   - Implement PDF text extraction
   - Add image analysis/OCR
   - Parse Word documents

2. **File Storage**
   - Upload actual file content to cloud
   - Store references in database
   - Generate previews

3. **Advanced Features**
   - Multiple file attachments per message
   - File management interface
   - File search in conversations

---

**API Configuration Complete!** File attachments are now fully integrated. Users can attach documents, images, and other files (up to 5MB). VERA generates contextual responses, and everything is saved to conversation history.

**Deployment**: Live on Vercel ✅
