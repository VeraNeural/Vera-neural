const { pool } = require('../lib/database');

// ==================== JOURNALING PROMPTS ====================
const JOURNALING_PROMPTS = {
  morning: [
    { id: 'morning-1', text: 'What\'s one thing your body wants to tell you today?' },
    { id: 'morning-2', text: 'Where do you feel the most alive right now?' },
    { id: 'morning-3', text: 'What would it mean to be truly seen today?' },
    { id: 'morning-4', text: 'What\'s asking for your attention?' },
    { id: 'morning-5', text: 'What does your nervous system need?' }
  ],
  evening: [
    { id: 'evening-1', text: 'What shifted inside you today?' },
    { id: 'evening-2', text: 'Where did you feel safe?' },
    { id: 'evening-3', text: 'What did you learn about yourself?' },
    { id: 'evening-4', text: 'What\'s still asking for compassion?' },
    { id: 'evening-5', text: 'How did your body carry you today?' }
  ],
  processing: [
    { id: 'proc-1', text: 'What pattern keeps showing up?' },
    { id: 'proc-2', text: 'What are you not saying out loud?' },
    { id: 'proc-3', text: 'If this feeling could speak, what would it say?' },
    { id: 'proc-4', text: 'What needs to be witnessed?' },
    { id: 'proc-5', text: 'What would love do right now?' }
  ]
};

module.exports = async (req, res) => {
  const { method, body } = req;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') return res.status(200).end();

  try {
    if (method === 'GET') {
      // Get available prompts
      const { category } = req.query;
      if (!category) {
        return res.status(400).json({ error: 'Category required' });
      }

      const prompts = JOURNALING_PROMPTS[category] || JOURNALING_PROMPTS.processing;
      
      return res.status(200).json({
        success: true,
        category,
        prompts,
        totalCount: prompts.length
      });
    }

    if (method === 'POST') {
      const { email, promptId, promptText, entryText, emotionalState } = body;

      if (!email || !promptId || !entryText) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get user
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userId = userResult.rows[0].id;

      // Save journal entry
      const result = await pool.query(
        `INSERT INTO journal_entries (user_id, prompt_id, prompt_text, entry_text, emotional_state, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, created_at`,
        [userId, promptId, promptText, entryText, emotionalState]
      );

      return res.status(200).json({
        success: true,
        journalId: result.rows[0].id,
        timestamp: result.rows[0].created_at,
        message: 'Journal entry saved. VERA is reading your words...'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Journaling API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
