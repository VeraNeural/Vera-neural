/**
 * Cron Job: Cleanup Expired Sessions
 * Runs daily at 2 AM UTC to delete expired sessions from database
 * 
 * Scheduled via vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-sessions",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 * 
 * Security: Requires CRON_SECRET header matching env variable
 */

const { pool } = require('../../lib/database');

module.exports = async (req, res) => {
  try {
    // Verify cron secret for security (prevent unauthorized calls)
    const cronSecret = req.headers['authorization']?.replace('Bearer ', '');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('❌ CRON_SECRET not configured in environment variables');
      return res.status(500).json({ error: 'CRON_SECRET not configured' });
    }

    if (!cronSecret || cronSecret !== expectedSecret) {
      console.warn('⚠️  Unauthorized cron request - invalid or missing CRON_SECRET');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🧹 Starting session cleanup cron job...');

    // Delete expired sessions
    const result = await pool.query(
      `DELETE FROM sessions WHERE expires_at < NOW()`
    );

    const deletedCount = result.rowCount;
    console.log(`✅ Deleted ${deletedCount} expired sessions`);

    // Also clean up expired magic links (older than 24 hours or already used)
    const magicLinkResult = await pool.query(
      `DELETE FROM magic_links WHERE expires_at < NOW() OR (used = TRUE AND created_at < NOW() - INTERVAL '24 hours')`
    );

    console.log(`✅ Deleted ${magicLinkResult.rowCount} expired magic links`);

    return res.status(200).json({
      success: true,
      message: 'Cleanup completed',
      sessionsDeleted: deletedCount,
      magicLinksDeleted: magicLinkResult.rowCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in session cleanup cron:', error.message);
    
    // Still return 200 so Vercel doesn't retry, but log the error
    return res.status(200).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
