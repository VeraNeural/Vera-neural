module.exports = (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Eleven Labs API key not configured' });
  }
  
  res.status(200).json({ apiKey });
};
