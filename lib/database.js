const { Pool } = require('pg');

// TLS hardening: verify certificates by default. Allow opt-out only via explicit env for local dev or production Supabase.
if (process.env.ALLOW_INSECURE_TLS === '1' || process.env.PGSSLMODE === 'require') {
  // Allow insecure TLS for local dev or for Vercel (Supabase self-signed cert)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  if (process.env.ALLOW_INSECURE_TLS === '1') {
    console.warn('[security] ALLOW_INSECURE_TLS=1 set: TLS certificate verification is DISABLED. Do not use in production.');
  }
  if (process.env.PGSSLMODE === 'require') {
    console.log('[db] PGSSLMODE=require: Connecting to database with SSL but not verifying certificate (for Supabase).');
  }
} else {
  // Ensure default is secure for production
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED; // restore Node default (verify)
  }
}

// Use correct Supabase project from environment or hardcoded as fallback
// Project: hfmggtnhgilxzbcmigpi (CORRECT - new project)
const connectionString = process.env.POSTGRES_URL_NON_POOLING || 'postgres://postgres:NewLIFE2028**@db.hfmggtnhgilxzbcmigpi.supabase.co:6543/postgres';
console.log('[db] ✅ CONNECTION STRING CONFIGURED - Project: hfmggtnhgilxzbcmigpi (NEW)');

// Handle SSL configuration for database connection
// Priority: PGSSLMODE env > ALLOW_INSECURE_TLS env > default (require verification)
const pgSslMode = (process.env.PGSSLMODE || '').toLowerCase();
let sslOption;

if (pgSslMode === 'disable') {
  // Disable SSL entirely
  sslOption = false;
} else if (pgSslMode === 'require') {
  // Require SSL but don't verify certificate (useful for self-signed certs like Supabase)
  sslOption = { rejectUnauthorized: false };
} else if (process.env.ALLOW_INSECURE_TLS === '1') {
  // Development mode: disable certificate verification
  sslOption = { rejectUnauthorized: false };
} else {
  // Production: require valid SSL certificate
  sslOption = { rejectUnauthorized: true };
}

const pool = new Pool({
  connectionString,
  ssl: sslOption,
  max: 5,  // Modest connection limit
  min: 0,   // Start with 0, create as needed
  idleTimeoutMillis: 30000,  // 30 seconds before closing idle connections
  connectionTimeoutMillis: 30000,  // 30 second timeout to acquire a connection (was 10s)
  statement_timeout: 30000  // 30 second statement timeout
});

// Log which database is being connected to
const dbHost = connectionString.match(/@([^:/]+)/)?.[1] || 'unknown';
const dbProject = connectionString.includes('hfmggtnhgilxzbcmigpi') ? '✅ CORRECT (hfmggtnhgilxzbcmigpi)' : 
                  connectionString.includes('enzrmswhjktmmzcrqthz') ? '❌ OLD (enzrmswhjktmmzcrqthz)' : '⚠️ UNKNOWN';
console.log(`[db] ✅ Database Pool Created - Host: ${dbHost}, Project: ${dbProject}`);

// Track if tables have been initialized
let tablesInitialized = false;

async function initTables() {
  // Skip if already initialized - this prevents multiple simultaneous init attempts
  if (tablesInitialized) {
    console.log('[db] initTables: Already initialized, skipping');
    return;
  }
  
  // Mark as being initialized immediately to prevent race conditions
  tablesInitialized = true;
  
  console.log('[db] initTables: Starting initialization...');
  try {
    // Use pool.query() directly instead of pool.connect() to avoid holding a connection
    // This automatically manages the connection lifecycle
    console.log('[db] initTables: Creating users table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(20),
        trial_start TIMESTAMP,
        trial_end TIMESTAMP,
        subscription_status VARCHAR(50) DEFAULT 'trial',
        stripe_customer_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Conversations: one-to-many with messages
    console.log('[db] initTables: Creating conversations table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        last_message_preview TEXT,
        message_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[db] initTables: Creating messages table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add conversation_id column if the table existed before
    console.log('[db] initTables: Adding conversation_id column if needed');
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE
    `);

    console.log('[db] initTables: Creating magic_links table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[db] initTables: Creating pattern_analyses table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pattern_analyses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        analysis TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[db] initTables: Creating saved_messages table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[db] initTables: Creating sessions table');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('[db] ✅ Tables initialized successfully');
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)
    `);
    
    console.log('[db] ✅ Tables initialized successfully');
  } catch (error) {
    // Reset the flag so next request can retry
    tablesInitialized = false;
    
    console.error('[db] initTables CRITICAL ERROR:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      poolStatus: {
        waitingCount: pool.waitingCount,
        idleCount: pool.idleCount,
        totalCount: pool.totalCount
      }
    });
    throw error;
  }
}

async function createUser(email) {
  await initTables();
  try {
    console.log('[db] createUser: Query preparing for:', email);
    const result = await pool.query(
      `INSERT INTO users (email, trial_start, trial_end, subscription_status, created_at)
       VALUES ($1, NOW(), NOW() + INTERVAL '48 hours', 'trial', NOW())
       ON CONFLICT (email) DO UPDATE SET subscription_status = CASE WHEN users.trial_end > NOW() THEN 'trial' ELSE EXCLUDED.subscription_status END
       RETURNING *`,
      [email]
    );
    console.log('[db] createUser: Query executed successfully');
    console.log('[db] createUser: Result:', {
      rowCount: result.rowCount,
      rows: result.rows.length,
      user: result.rows[0] ? {
        id: result.rows[0].id,
        email: result.rows[0].email,
        created_at: result.rows[0].created_at,
        trial_start: result.rows[0].trial_start,
        trial_end: result.rows[0].trial_end
      } : null
    });
    return result.rows[0];
  } catch (error) {
    console.error('[db] createUser CRITICAL ERROR:', {
      email: email,
      message: error.message,
      code: error.code,
      detail: error.detail,
      severity: error.severity,
      position: error.position,
      poolStatus: {
        waitingCount: pool.waitingCount,
        idleCount: pool.idleCount,
        totalCount: pool.totalCount
      },
      fullStack: error.stack
    });
    throw error;
  }
}

async function getUserByEmail(email) {
  await initTables();
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  } catch (error) {
    console.error('[db] getUserByEmail error:', error.message);
    throw error;
  }
}

async function getUserById(id) {
  await initTables();
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } catch (error) {
    console.error('[db] getUserById error:', error.message);
    throw error;
  }
}

async function getUserByPhone(phone_number) {
  await initTables();
  try {
    // Normalize phone to digits only
    const phoneDigits = phone_number.replace(/\D/g, '');
    const result = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phoneDigits]);
    return result.rows[0];
  } catch (error) {
    console.error('[db] getUserByPhone error:', error.message);
    throw error;
  }
}

async function updateUserSubscription(email, status, stripeCustomerId = null) {
  try {
    const result = await pool.query(
      `UPDATE users SET subscription_status = $1, stripe_customer_id = $2 WHERE email = $3 RETURNING *`,
      [status, stripeCustomerId, email]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[db] updateUserSubscription error:', error.message);
    throw error;
  }
}

async function saveMessage(userId, role, content) {
  await initTables();
  try {
    const result = await pool.query(
      `INSERT INTO messages (user_id, conversation_id, role, content, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [userId, null, role, content]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[db] saveMessage error:', error.message);
    throw error;
  }
}

// Save a message into a specific conversation (preferred when conversationId is known)
async function saveMessageInConversation(userId, conversationId, role, content) {
  await initTables();
  try {
    const result = await pool.query(
      `INSERT INTO messages (user_id, conversation_id, role, content, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [userId, conversationId, role, content]
    );
    // Update conversation metadata
    const preview = String(content).slice(0, 200);
    await pool.query(
      `UPDATE conversations
       SET last_message_preview = $1,
           message_count = COALESCE(message_count, 0) + 1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [preview, conversationId, userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[db] saveMessageInConversation error:', error.message);
    throw error;
  }
}

async function createConversation(userId, title) {
  await initTables();
  try {
    const safeTitle = (title && title.trim()) ? title.trim().slice(0, 255) : 'New conversation';
    const result = await pool.query(
      `INSERT INTO conversations (user_id, title, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
      [userId, safeTitle]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[db] createConversation error:', error.message);
    throw error;
  }
}

async function getConversationsByUser(userId, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT id, title, last_message_preview, message_count, created_at, updated_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('[db] getConversationsByUser error:', error.message);
    throw error;
  }
}

async function getConversationMessagesForUser(userId, conversationId) {
  try {
    const result = await pool.query(
      `SELECT role, content, created_at
       FROM messages
       WHERE user_id = $1 AND conversation_id = $2
       ORDER BY created_at ASC`,
      [userId, conversationId]
    );
    return result.rows;
  } catch (error) {
    console.error('[db] getConversationMessagesForUser error:', error.message);
    throw error;
  }
}

async function deleteConversationForUser(userId, conversationId) {
  try {
    // Delete messages first (ON DELETE CASCADE should handle, but explicit for safety)
    await pool.query(
      `DELETE FROM messages WHERE user_id = $1 AND conversation_id = $2`,
      [userId, conversationId]
    );
    const result = await pool.query(
      `DELETE FROM conversations WHERE user_id = $1 AND id = $2 RETURNING id`,
      [userId, conversationId]
    );
    return result.rowCount > 0;
  } catch (error) {
    console.error('[db] deleteConversationForUser error:', error.message);
    throw error;
  }
}

async function getRecentMessages(userId, limit = 10) {
  try {
    const result = await pool.query(
      `SELECT * FROM messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows.reverse();
  } catch (error) {
    console.error('[db] getRecentMessages error:', error.message);
    throw error;
  }
}

async function getMessagesForAnalysis(userId, days = 7) {
  try {
    const result = await pool.query(
      `SELECT * FROM messages WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${days} days' ORDER BY created_at ASC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('[db] getMessagesForAnalysis error:', error.message);
    throw error;
  }
}

async function savePatternAnalysis(userId, analysis) {
  await initTables();
  try {
    const result = await pool.query(
      `INSERT INTO pattern_analyses (user_id, analysis, created_at) VALUES ($1, $2, NOW()) RETURNING *`,
      [userId, JSON.stringify(analysis)]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[db] savePatternAnalysis error:', error.message);
    throw error;
  }
}

async function getLatestAnalysis(userId) {
  try {
    const result = await pool.query(
      `SELECT * FROM pattern_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[db] getLatestAnalysis error:', error.message);
    throw error;
  }
}

async function createMagicLink(email, token, expiresAt) {
  await initTables();
  try {
    console.log('[db] createMagicLink: Starting for email:', email, 'token length:', token.length);
    console.log('[db] createMagicLink: Query params:', {
      email: email,
      tokenLength: token.length,
      expiresAt: expiresAt,
      expiresAtType: typeof expiresAt
    });
    
    const result = await pool.query(
      `INSERT INTO magic_links (email, token, expires_at, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *`,
      [email, token, expiresAt]
    );
    console.log('[db] createMagicLink: Query executed successfully');
    console.log('[db] createMagicLink: Result:', {
      rowCount: result.rowCount,
      magicLink: result.rows[0] ? {
        id: result.rows[0].id,
        email: result.rows[0].email,
        expiresAt: result.rows[0].expires_at,
        used: result.rows[0].used,
        created_at: result.rows[0].created_at
      } : null
    });
    return result.rows[0];
  } catch (error) {
    console.error('[db] createMagicLink CRITICAL ERROR:', {
      email: email,
      message: error.message,
      code: error.code,
      detail: error.detail,
      severity: error.severity,
      poolStatus: {
        waitingCount: pool.waitingCount,
        idleCount: pool.idleCount,
        totalCount: pool.totalCount
      },
      fullStack: error.stack
    });
    throw error;
  }
}

async function getMagicLink(token) {
  await initTables();
  try {
    const result = await pool.query(
      `SELECT * FROM magic_links WHERE token = $1 AND expires_at > NOW() AND used = false`,
      [token]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[db] getMagicLink error:', error.message);
    throw error;
  }
}

async function markMagicLinkUsed(token) {
  try {
    await pool.query(`UPDATE magic_links SET used = true WHERE token = $1`, [token]);
  } catch (error) {
    console.error('[db] markMagicLinkUsed error:', error.message);
    throw error;
  }
}

/**
 * Save a message/conversation to the user's saved collection
 */
async function saveMessageToCollection(userId, conversationId, messageId) {
  await initTables();
  try {
    const result = await pool.query(
      `INSERT INTO saved_messages (user_id, conversation_id, message_id, saved_at) 
       VALUES ($1, $2, $3, NOW()) 
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [userId, conversationId, messageId]
    );
    console.log('[db] saveMessageToCollection: Saved message', messageId, 'for user', userId);
    return result.rows[0];
  } catch (error) {
    console.error('[db] saveMessageToCollection error:', error.message);
    throw error;
  }
}

/**
 * Get all saved messages for a user
 */
async function getSavedMessages(userId) {
  await initTables();
  try {
    const result = await pool.query(
      `SELECT sm.id, sm.saved_at, m.id as message_id, m.role, m.content, c.id as conversation_id, c.title
       FROM saved_messages sm
       JOIN messages m ON sm.message_id = m.id
       JOIN conversations c ON sm.conversation_id = c.id
       WHERE sm.user_id = $1
       ORDER BY sm.saved_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('[db] getSavedMessages error:', error.message);
    throw error;
  }
}

/**
 * Remove a message from saved collection
 */
async function removeSavedMessage(userId, savedMessageId) {
  try {
    await pool.query(
      `DELETE FROM saved_messages WHERE id = $1 AND user_id = $2`,
      [savedMessageId, userId]
    );
    console.log('[db] removeSavedMessage: Removed saved message', savedMessageId);
  } catch (error) {
    console.error('[db] removeSavedMessage error:', error.message);
    throw error;
  }
}

/**
 * Sync localStorage messages to database (migration helper)
 */
async function syncSavedMessages(userId, localMessages) {
  await initTables();
  try {
    // localMessages should be an array of {conversationId, messageId, ...}
    let syncedCount = 0;
    
    for (const msg of localMessages) {
      try {
        await saveMessageToCollection(userId, msg.conversationId, msg.messageId);
        syncedCount++;
      } catch (err) {
        console.warn('[db] syncSavedMessages: Failed to sync message', msg.messageId, err.message);
      }
    }
    
    console.log('[db] syncSavedMessages: Synced', syncedCount, 'messages for user', userId);
    return { synced: syncedCount, total: localMessages.length };
  } catch (error) {
    console.error('[db] syncSavedMessages error:', error.message);
    throw error;
  }
}

/**
 * Create a session in database
 */
async function createDatabaseSession(userId, token, expiresAt) {
  await initTables();
  try {
    const result = await pool.query(
      `INSERT INTO sessions (user_id, token, expires_at, created_at) 
       VALUES ($1, $2, $3, NOW()) 
       RETURNING *`,
      [userId, token, expiresAt]
    );
    console.log('[db] createDatabaseSession: Session created for user', userId);
    return result.rows[0];
  } catch (error) {
    console.error('[db] createDatabaseSession error:', error.message);
    throw error;
  }
}

/**
 * Get session by token
 */
async function getSessionByToken(token) {
  await initTables();
  try {
    const result = await pool.query(
      `SELECT s.*, u.email, u.subscription_status, u.trial_end 
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[db] getSessionByToken error:', error.message);
    throw error;
  }
}

/**
 * Revoke session by token
 */
async function revokeSessionByToken(token) {
  try {
    await pool.query(
      `DELETE FROM sessions WHERE token = $1`,
      [token]
    );
    console.log('[db] revokeSessionByToken: Session revoked');
  } catch (error) {
    console.error('[db] revokeSessionByToken error:', error.message);
    throw error;
  }
}

module.exports = {
  initTables,
  createUser,
  getUserByEmail,
  getUserById,
  getUserByPhone,
  updateUserSubscription,
  saveMessage,
  saveMessageInConversation,
  getRecentMessages,
  getMessagesForAnalysis,
  savePatternAnalysis,
  getLatestAnalysis,
  createMagicLink,
  getMagicLink,
  markMagicLinkUsed,
  createConversation,
  getConversationsByUser,
  getConversationMessagesForUser,
  deleteConversationForUser,
  saveMessageToCollection,
  getSavedMessages,
  removeSavedMessage,
  syncSavedMessages,
  createDatabaseSession,
  getSessionByToken,
  revokeSessionByToken,
  pool
};
