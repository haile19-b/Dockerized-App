const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/health', async (req, res) => {
  try {
    await db.checkHealth();
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
