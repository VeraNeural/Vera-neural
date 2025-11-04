const https = require('https');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voiceId, stability, similarityBoost } = req.body;

    if (!text || !voiceId) {
      return res.status(400).json({ error: 'Text and voiceId required' });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Eleven Labs API key not configured' });
    }

    // Call Eleven Labs API
    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    };

    // Make the request
    const result = await new Promise((resolve, reject) => {
      const elevenReq = https.request(options, (elevenRes) => {
        let data = Buffer.alloc(0);

        elevenRes.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });

        elevenRes.on('end', () => {
          if (elevenRes.statusCode === 200) {
            resolve({ success: true, audio: data, contentType: elevenRes.headers['content-type'] });
          } else {
            resolve({
              success: false,
              status: elevenRes.statusCode,
              error: data.toString('utf-8'),
            });
          }
        });
      });

      elevenReq.on('error', (error) => {
        reject(error);
      });

      const requestBody = {
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: stability || 0.5,
          similarity_boost: similarityBoost || 0.5,
        },
      };

      elevenReq.write(JSON.stringify(requestBody));
      elevenReq.end();
    });

    if (!result.success) {
      console.error('[TTS] Eleven Labs error:', result);
      return res.status(result.status || 500).json({
        error: 'Failed to generate speech',
        details: result.error,
      });
    }

    // Return audio as blob
    res.setHeader('Content-Type', result.contentType || 'audio/mpeg');
    res.setHeader('Content-Length', result.audio.length);
    res.status(200).send(result.audio);
  } catch (error) {
    console.error('[TTS] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
