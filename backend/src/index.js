require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const healthRoutes = require('./routes/health');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend communication (allow all headers including x-session-id)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
}));

// Body parser
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Dockerized AI Chatbot API',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      messages: 'GET /api/messages',
      chat: 'POST /api/chat',
      clear: 'DELETE /api/messages',
    },
  });
});

// Mount API routes
app.use('/api', healthRoutes);
app.use('/api', chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server after verifying / initializing database
async function startServer() {
  try {
    console.log('[App] Initializing database...');
    await db.initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[App] Chatbot Backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[App] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
