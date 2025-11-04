const { analyzeConversation } = require('../lib/gpt4');
const { getUserByEmail, getMessagesForAnalysis, savePatternAnalysis } = require('../lib/database');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, days = 7 } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const messages = await getMessagesForAnalysis(user.id, days);

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Not enough conversation history for analysis' });
    }

    const analysis = await analyzeConversation(messages);

    await savePatternAnalysis(user.id, { analysis, days, messageCount: messages.length });

    res.status(200).json({ 
      analysis,
      messageCount: messages.length,
      daysAnalyzed: days
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
