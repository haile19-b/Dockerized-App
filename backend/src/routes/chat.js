const express = require('express');
const router = express.Router();
const db = require('../db');
const gemini = require('../gemini');

const getSessionId = (req) => {
  return req.headers['x-session-id'] || req.query.sessionId || req.body?.sessionId || 'default';
};

// GET /api/messages - Retrieve conversation history for current session
router.get('/messages', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    const messages = await db.getMessages(sessionId);
    return res.status(200).json(messages);
  } catch (err) {
    console.error('[Route /messages GET] Error:', err);
    return res.status(500).json({ error: 'Failed to retrieve messages from database.' });
  }
});

// POST /api/chat - Process user message, call Gemini, and store both messages under session
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId: bodySessionId } = req.body;
    const sessionId = bodySessionId || getSessionId(req);

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const trimmedMessage = message.trim();

    // 1. Save user message to PostgreSQL for this session
    const userMessage = await db.saveMessage('user', trimmedMessage, sessionId);

    // 2. Fetch session conversation history to provide context if needed
    const history = await db.getMessages(sessionId);

    // 3. Request AI response from Gemini
    const replyText = await gemini.generateChatResponse(trimmedMessage, history);

    // 4. Save assistant response to PostgreSQL for this session
    const assistantMessage = await db.saveMessage('assistant', replyText, sessionId);

    return res.status(200).json({
      reply: replyText,
      userMessage,
      assistantMessage,
      sessionId,
    });
  } catch (err) {
    console.error('[Route /chat POST] Error:', err);
    return res.status(500).json({
      error: 'An unexpected error occurred while processing the chat request.',
      details: err.message,
    });
  }
});

// DELETE /api/messages - Clear conversation history for current session
router.delete('/messages', async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    await db.clearMessages(sessionId);
    return res.status(200).json({ message: 'Conversation history cleared successfully.' });
  } catch (err) {
    console.error('[Route /messages DELETE] Error:', err);
    return res.status(500).json({ error: 'Failed to clear conversation history.' });
  }
});

module.exports = router;
