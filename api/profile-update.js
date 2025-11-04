const { getUserByEmail, getUserByPhone } = require('../lib/database');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method === 'POST') {
    try {
      const { email, phone_number } = req.body;
      
      if (!email || !phone_number) {
        return res.status(400).json({ error: 'Email and phone number required' });
      }
      
      // Validate phone format (basic: 10+ digits, no letters)
      const phoneDigits = phone_number.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        return res.status(400).json({ error: 'Phone number must have at least 10 digits' });
      }
      
      // Check if phone already exists for another user
      const existingPhoneUser = await getUserByPhone(phoneDigits);
      if (existingPhoneUser && existingPhoneUser.email !== email) {
        return res.status(409).json({ 
          error: 'Phone number already registered',
          code: 'DUPLICATE_PHONE'
        });
      }
      
      // Get or create user
      const { createUser } = require('../lib/database');
      let user = await getUserByEmail(email);
      if (!user) {
        // Create user if doesn't exist (for trial upgrade flow)
        user = await createUser(email);
      }
      
      // Update user with phone number
      const { pool } = require('../lib/database');
      const result = await pool.query(
        'UPDATE users SET phone_number = $1 WHERE email = $2 RETURNING *',
        [phoneDigits, email]
      );
      
      return res.status(200).json({ 
        success: true,
        user: {
          email: result.rows[0].email,
          phone_number: result.rows[0].phone_number
        }
      });
    } catch (err) {
      console.error('[profile-update] error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  if (req.method === 'GET') {
    try {
      const email = req.query.email;
      if (!email) {
        return res.status(400).json({ error: 'Email query parameter required' });
      }
      
      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.status(200).json({
        email: user.email,
        phone_number: user.phone_number || null,
        trial_end: user.trial_end
      });
    } catch (err) {
      console.error('[profile-update] GET error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
