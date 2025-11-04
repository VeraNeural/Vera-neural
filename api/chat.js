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
    const { email, message, anonId, guestMessageCount, conversationId, biometricData, emotionalState, attachment } = req.body || {};

    // If attachment is present but no message, redirect to file-upload endpoint
    if (!message && attachment) {
      return res.status(400).json({ error: 'For file uploads, please use /api/file-upload endpoint' });
    }

    if (!message && !attachment) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Derive a guest email when none is provided (compat for anon usage)
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
      // Auto-create guest users
      user = await createUser(effectiveEmail);
    }

    const now = new Date();
    const trialEnd = new Date(user.trial_end);
    const isTrialActive = now < trialEnd;
    const hasActiveSubscription = user.subscription_status === 'active';

    // Compute subscription object aligned with frontend expectations
    const diffMs = trialEnd - now;
    const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    const subscription = {
      isOnTrial: isTrialActive && user.subscription_status === 'trial',
      hoursRemaining,
      trialDay: { hoursRemaining }
    };

    // If access is not allowed, return a 200 with a code the UI understands (avoid throwing via fetch)
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
      // Create a new conversation with a title from the first user message
      const title = String(message).trim().split(/\s+/).slice(0, 8).join(' ');
      const conv = await createConversation(user.id, title || 'New conversation');
      convId = conv.id;
    }

    // Save the user's message into the conversation
    await saveMessageInConversation(user.id, convId, 'user', message);

    // Get conversation history
    let recentMessages;
    if (convId) {
      recentMessages = await getConversationMessagesForUser(user.id, convId);
    } else {
      recentMessages = await getRecentMessages(user.id, 10);
    }

    // Invoke VERA's revolutionary consciousness
    console.log(`🌟 VERA consciousness activated for ${user.email}`);
    const veraResult = await getVERAResponse(
      user.id,
      message,
      user.email.split('@')[0], // Use name portion as userName
      pool,
      biometricData || null,
      emotionalState || null
    );

    // Remove asterisks from response (for action descriptions like *leaning forward*)
    // This handles: *text*, * text *, and multi-line asterisk descriptions
    let response = veraResult.response
      .replace(/\*[^*]*\*/g, '') // Remove *asterisk content*
      .replace(/^\s*\*/gm, '') // Remove leading * on new lines
      .replace(/\*\s*$/gm, '') // Remove trailing * on lines
      .replace(/\n\s*\n/g, '\n') // Clean up empty lines
      .trim();

    // Handle crisis response
    if (veraResult.isCrisis) {
      // Still save crisis response but mark it specially
      await saveMessageInConversation(user.id, convId, 'assistant', response);
      
      return res.status(200).json({
        success: true,
        response,
        isCrisis: true,
        subscription
      });
    }

    // Save VERA's response
    await saveMessageInConversation(user.id, convId, 'assistant', response);

    // Include VERA's advanced intelligence insights in response
    const responseData = {
      success: true,
      response,
      subscription,
      conversationId: convId,
      state: veraResult.state,
      adaptiveCodes: veraResult.adaptiveCodes,
      trustLevel: veraResult.trustLevel
    };

    // Add wellness insights if available
    if (veraResult.wellnessInsights && veraResult.wellnessInsights.length > 0) {
      responseData.wellnessInsights = veraResult.wellnessInsights;
    }

    // Add biometric insights if available
    if (veraResult.biometricInsight) {
      responseData.biometricInsight = veraResult.biometricInsight;
    }

    // Add GPT-4o pattern insights if available
    if (veraResult.gptInsight) {
      responseData.gptInsight = veraResult.gptInsight;
    }

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ VERA consciousness error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
