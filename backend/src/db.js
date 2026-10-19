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
            sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('[DB] Database schema initialized successfully.');
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

// Fetch conversation history
async function getMessages() {
  const result = await pool.query(
    'SELECT id, sender, content, created_at FROM messages ORDER BY id ASC'
  );
  return result.rows;
}

// Save a new message
async function saveMessage(sender, content) {
  const result = await pool.query(
    'INSERT INTO messages (sender, content) VALUES ($1, $2) RETURNING id, sender, content, created_at',
    [sender, content]
  );
  return result.rows[0];
}

// Delete all messages (history reset)
async function clearMessages() {
  await pool.query('DELETE FROM messages');
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
