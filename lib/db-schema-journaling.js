// ==================== JOURNALING & GROUNDING SCHEMA ====================
// Run this once to set up the database tables for journaling and grounding

const setupJournalingTables = async (pool) => {
  try {
    // Journal Entries Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prompt_id VARCHAR(50) NOT NULL,
        prompt_text TEXT NOT NULL,
        entry_text TEXT NOT NULL,
        emotional_state VARCHAR(50),
        adaptive_codes TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, prompt_id, created_at::DATE)
      );
      
      CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_journal_created_at ON journal_entries(created_at);
    `);
    console.log('✅ Journal entries table created');

    // Grounding Sessions Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grounding_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        grounding_type VARCHAR(50) NOT NULL,
        duration_seconds INTEGER,
        heart_rate_before INTEGER,
        heart_rate_after INTEGER,
        stress_before INTEGER,
        stress_after INTEGER,
        breathing_rate_before INTEGER,
        breathing_rate_after INTEGER,
        user_note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_grounding_user_id ON grounding_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_grounding_created_at ON grounding_sessions(created_at);
      CREATE INDEX IF NOT EXISTS idx_grounding_type ON grounding_sessions(grounding_type);
    `);
    console.log('✅ Grounding sessions table created');

  } catch (error) {
    console.error('❌ Schema setup error:', error);
  }
};

module.exports = { setupJournalingTables };
