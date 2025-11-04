const { getVERAResponse } = require('../lib/vera-consciousness');
const {
  getUserByEmail,
  createUser,
  saveMessageInConversation,
  getConversationMessagesForUser,
  createConversation,
  getRecentMessages,
  pool
} = require('../lib/database');

module.exports = async (req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, message, anonId, conversationId, attachment } = req.body || {};

    if (!attachment) {
      return res.status(400).json({ error: 'Attachment required' });
    }

    // Validate file size (max 5MB)
    if (attachment.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }

    // Derive guest email if needed
    let effectiveEmail = email;
    if (!effectiveEmail) {
      if (anonId && typeof anonId === 'string') {
        effectiveEmail = `guest.${anonId}@guest.local`;
      } else {
        effectiveEmail = 'guest@temp.local';
      }
    }

    let user = await getUserByEmail(effectiveEmail);
    if (!user) {
      user = await createUser(effectiveEmail);
    }

    const now = new Date();
    const trialEnd = new Date(user.trial_end);
    const isTrialActive = now < trialEnd;
    const hasActiveSubscription = user.subscription_status === 'active';

    const diffMs = trialEnd - now;
    const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    const subscription = {
      isOnTrial: isTrialActive && user.subscription_status === 'trial',
      hoursRemaining,
      trialDay: { hoursRemaining }
    };

    if (!isTrialActive && !hasActiveSubscription) {
      return res.status(200).json({
        success: false,
        code: 'TRIAL_EXPIRED',
        subscription
      });
    }

    // Ensure conversation context
    let convId = conversationId || null;
    if (!convId) {
      const title = `File: ${attachment.name}`;
      const conv = await createConversation(user.id, title);
      convId = conv.id;
    }

    // Save user message about file
    const userMessage = `I've attached a file: ${attachment.name} (${attachment.type})`;
    await saveMessageInConversation(user.id, convId, 'user', userMessage);

    // Get conversation history
    const recentMessages = await getConversationMessagesForUser(user.id, convId);

    // Process attachment based on file type
    let attachmentContext = '';
    
    if (attachment.type.includes('image')) {
      attachmentContext = `User has shared an image file: ${attachment.name}. Please analyze the image if it was uploaded.`;
    } else if (attachment.type.includes('pdf') || attachment.type === 'application/pdf') {
      attachmentContext = `User has shared a PDF document: ${attachment.name}. Please help them with questions about this document.`;
    } else if (attachment.type.includes('text') || attachment.name.endsWith('.txt')) {
      attachmentContext = `User has shared a text document: ${attachment.name}. Please analyze and help them with content from this document.`;
    } else if (attachment.type.includes('word') || attachment.name.endsWith('.docx') || attachment.name.endsWith('.doc')) {
      attachmentContext = `User has shared a Word document: ${attachment.name}. Please help them review this document.`;
    } else {
      attachmentContext = `User has shared a file: ${attachment.name} (${attachment.type}). Please acknowledge and help if possible.`;
    }

    // Combine user message with attachment context
    const enhancedMessage = message ? `${message}\n\n${attachmentContext}` : attachmentContext;

    // Get VERA response
    console.log(`📎 Processing file attachment for ${user.email}: ${attachment.name}`);
    const veraResult = await getVERAResponse(
      user.id,
      enhancedMessage,
      user.email.split('@')[0],
      pool,
      null,
      null
    );

    // Clean up response
    let response = veraResult.response
      .replace(/\*[^*]*\*/g, '')
      .replace(/^\s*\*/gm, '')
      .replace(/\*\s*$/gm, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Save VERA response
    await saveMessageInConversation(user.id, convId, 'assistant', response);

    // Return response with attachment metadata
    return res.status(200).json({
      success: true,
      response,
      conversationId: convId,
      attachment: {
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        processed: true
      },
      subscription
    });

  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ 
      error: 'Error processing file attachment',
      message: error.message 
    });
  }
};
