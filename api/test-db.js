const { pool } = require('../lib/database');

module.exports = async (req, res) => {
  console.log('[test-db] Starting database connectivity test');
  
  try {
    console.log('[test-db] Attempting to acquire connection from pool');
    console.log('[test-db] Pool status before connect:', {
      waitingCount: pool.waitingCount,
      idleCount: pool.idleCount,
      totalCount: pool.totalCount
    });

    const startTime = Date.now();
    const client = await pool.connect();
    const connectTime = Date.now() - startTime;
    
    console.log('[test-db] Connection acquired successfully in', connectTime, 'ms');

    try {
      console.log('[test-db] Executing simple query: SELECT NOW()');
      const result = await client.query('SELECT NOW()');
      console.log('[test-db] Query successful:', result.rows[0]);
      
      return res.status(200).json({
        success: true,
        message: 'Database connection successful',
        timestamp: result.rows[0].now,
        connectTime: connectTime
      });
    } finally {
      console.log('[test-db] Releasing connection');
      client.release();
    }
  } catch (error) {
    console.error('[test-db] FAILED:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      poolStatus: {
        waitingCount: pool.waitingCount,
        idleCount: pool.idleCount,
        totalCount: pool.totalCount
      }
    });
    
    return res.status(500).json({
      error: 'Database connection failed',
      details: error.message,
      code: error.code
    });
  }
};
