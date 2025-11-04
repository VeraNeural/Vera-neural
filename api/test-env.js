module.exports = async (req, res) => {
  try {
    // Test database connection
    const { Pool } = require('pg');
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
    
    let dbStatus = '✗ MISSING';
    let dbError = null;
    
    if (connectionString) {
      try {
        const testPool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
        const client = await testPool.connect();
        await client.query('SELECT 1');
        client.release();
        await testPool.end();
        dbStatus = '✓ CONNECTED';
      } catch (err) {
        dbStatus = '✗ ERROR';
        dbError = err.message;
      }
    }

    const envVars = {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? '✓ SET' : '✗ MISSING',
      EMAIL_FROM: process.env.EMAIL_FROM ? '✓ SET' : '✗ MISSING',
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? '✓ SET' : '✗ MISSING',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✓ SET' : '✗ MISSING',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ SET' : '✗ MISSING',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '✓ SET' : '✗ MISSING',
      APP_URL: process.env.APP_URL || 'unknown'
    };

    res.status(200).json({
      environment: 'vercel',
      message: 'Environment variables status',
      database: { status: dbStatus, error: dbError },
      vars: envVars
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test endpoint error',
      message: error.message
    });
  }
};
