const { pool } = require('../lib/database');

// ==================== GROUNDING TECHNIQUES ====================
const GROUNDING_TECHNIQUES = {
  '5-4-3-2-1': {
    name: '5-4-3-2-1 Anchor',
    duration: 120,
    description: 'Notice 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste',
    steps: [
      'Notice 5 things you can SEE around you',
      'Find 4 things you can TOUCH',
      'Listen for 3 things you can HEAR',
      'Identify 2 things you can SMELL',
      'Notice 1 thing you can TASTE'
    ]
  },
  'breathing': {
    name: 'Coherent Breathing',
    duration: 180,
    description: 'Regulated breathing to calm your nervous system',
    steps: [
      'Breathe in for 4 counts',
      'Hold for 4 counts',
      'Breathe out for 4 counts',
      'Hold for 4 counts',
      'Repeat 9 times (3 minutes total)'
    ]
  },
  'body-scan': {
    name: 'Body Scan',
    duration: 300,
    description: 'Slowly scan and relax your entire body',
    steps: [
      'Start with your toes - notice any sensation',
      'Move attention up through your feet and legs',
      'Notice your core, heart, and belly',
      'Scan your chest, shoulders, and arms',
      'Move through your neck, face, and head',
      'Release any tension you find'
    ]
  },
  'tapping': {
    name: 'Gentle Tapping (EFT)',
    duration: 240,
    description: 'Tap acupressure points to calm your system',
    steps: [
      'Tap the side of your hand (karate chop point) while saying: "Even though I feel [emotion], I accept myself"',
      'Now tap these points 5-7 times each while saying: "It\'s safe to release this"',
      'Inner eyebrow, outer corner of eye, under eye, under nose, under lower lip, collarbone'
    ]
  }
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
      // Get available grounding techniques
      const techniques = Object.entries(GROUNDING_TECHNIQUES).map(([key, value]) => ({
        id: key,
        ...value
      }));

      return res.status(200).json({
        success: true,
        techniques,
        message: 'Choose what your nervous system needs right now'
      });
    }

    if (method === 'POST') {
      const {
        email,
        groundingType,
        durationSeconds,
        heartRateBefore,
        heartRateAfter,
        stressBefore,
        stressAfter,
        userNote
      } = body;

      if (!email || !groundingType) {
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

      // Save grounding session
      const result = await pool.query(
        `INSERT INTO grounding_sessions 
         (user_id, grounding_type, duration_seconds, heart_rate_before, heart_rate_after, 
          stress_before, stress_after, user_note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING id, created_at`,
        [
          userId,
          groundingType,
          durationSeconds,
          heartRateBefore || null,
          heartRateAfter || null,
          stressBefore || null,
          stressAfter || null,
          userNote || null
        ]
      );

      // Calculate improvement
      let improvement = null;
      if (heartRateBefore && heartRateAfter) {
        improvement = {
          heartRateChange: heartRateBefore - heartRateAfter,
          stressChange: stressBefore && stressAfter ? stressBefore - stressAfter : null
        };
      }

      return res.status(200).json({
        success: true,
        sessionId: result.rows[0].id,
        timestamp: result.rows[0].created_at,
        improvement,
        message: improvement && improvement.heartRateChange > 0 
          ? `Your nervous system shifted ${improvement.heartRateChange} bpm. Well done.`
          : 'Session saved. VERA is learning your patterns.'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Grounding API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
