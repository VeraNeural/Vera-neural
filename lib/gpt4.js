const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ANALYSIS_PROMPT = `You are analyzing conversation patterns to identify nervous system states and themes.

Based on the conversation history provided, identify:
1. Recurring nervous system patterns (fight, flight, freeze, fawn)
2. Common themes or triggers
3. Moments of regulation or dysregulation
4. Body-based observations
5. Progress or shifts over time

Provide a compassionate, insightful analysis that helps the person understand their patterns without pathologizing them.

Keep the analysis warm, clear, and actionable. Focus on what's present, not what's wrong.`;

async function analyzeConversation(messages) {
  const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: ANALYSIS_PROMPT },
      { role: 'user', content: `Analyze these conversations:\n\n${conversationText}` }
    ],
    max_tokens: 1000,
    temperature: 0.7
  });

  return response.choices[0].message.content;
}

module.exports = {
  analyzeConversation
};
