/**
 * API: /api/saved-messages
 * Manages saved messages/conversations for authenticated users
 * GET: fetch all saved messages
 * POST: save a message
 * DELETE: remove a saved message
 */

const { getSavedMessages, saveMessageToCollection, removeSavedMessage, syncSavedMessages, getUserByEmail } = require('../lib/database');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { email } = req.body;

    // Require email for auth (in production, use proper JWT/session)
    if (!email) {
      return res.status(401).json({ error: 'Email required for authentication' });
    }

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const userId = user.id;

    // GET: Fetch all saved messages for user
    if (req.method === 'GET') {
      const savedMessages = await getSavedMessages(userId);
      console.log(`✅ Retrieved ${savedMessages.length} saved messages for user ${userId}`);
      return res.status(200).json({ 
        success: true, 
        count: savedMessages.length, 
        messages: savedMessages 
      });
    }

    // POST: Save a message or sync from localStorage
    if (req.method === 'POST') {
      const { action, messageId, conversationId, localMessages } = req.body;

      if (action === 'sync') {
        // Bulk sync from localStorage
        if (!Array.isArray(localMessages)) {
          return res.status(400).json({ error: 'localMessages must be an array' });
        }
        const result = await syncSavedMessages(userId, localMessages);
        console.log(`✅ Synced ${result.synced}/${result.total} messages for user ${userId}`);
        return res.status(200).json({ success: true, ...result });
      }

      if (action === 'save') {
        // Save single message
        if (!messageId || !conversationId) {
          return res.status(400).json({ error: 'messageId and conversationId required' });
        }
        await saveMessageToCollection(userId, conversationId, messageId);
        console.log(`✅ Saved message ${messageId} for user ${userId}`);
        return res.status(200).json({ success: true, messageId, conversationId });
      }

      return res.status(400).json({ error: 'Invalid action. Use "save" or "sync"' });
    }

    // DELETE: Remove a saved message
    if (req.method === 'DELETE') {
      const { savedMessageId } = req.body;
      if (!savedMessageId) {
        return res.status(400).json({ error: 'savedMessageId required' });
      }
      await removeSavedMessage(userId, savedMessageId);
      console.log(`✅ Removed saved message ${savedMessageId} for user ${userId}`);
      return res.status(200).json({ success: true, savedMessageId });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Error in saved-messages:', error.message);
    return res.status(500).json({ 
      error: error.message || 'Failed to manage saved messages' 
    });
  }
};
