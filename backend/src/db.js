const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres_password@db:5432/chatbot_db',
});

// Initialize database schema with automatic retry
async function initDb(retries = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[DB] Connecting to PostgreSQL (Attempt ${attempt}/${retries})...`);
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(100) DEFAULT 'default',
            sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id VARCHAR(100) DEFAULT 'default';
          CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id);
        `);
        console.log('[DB] Database schema and session index initialized successfully.');
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`[DB] Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('[DB] All database connection attempts exhausted.');
        throw err;
      }
    }
  }
}

// Fetch conversation history for a specific session/user
async function getMessages(sessionId = 'default') {
  const result = await pool.query(
    'SELECT id, sender, content, session_id, created_at FROM messages WHERE session_id = $1 ORDER BY id ASC',
    [sessionId]
  );
  return result.rows;
}

// Save a new message for a specific session/user
async function saveMessage(sender, content, sessionId = 'default') {
  const result = await pool.query(
    'INSERT INTO messages (sender, content, session_id) VALUES ($1, $2, $3) RETURNING id, sender, content, session_id, created_at',
    [sender, content, sessionId]
  );
  return result.rows[0];
}

// Delete all messages for a specific session/user
async function clearMessages(sessionId = 'default') {
  await pool.query('DELETE FROM messages WHERE session_id = $1', [sessionId]);
}

// Check database connection health
async function checkHealth() {
  const result = await pool.query('SELECT 1 as healthy');
  return result.rows.length > 0;
}

module.exports = {
  pool,
  initDb,
  getMessages,
  saveMessage,
  clearMessages,
  checkHealth,
};
