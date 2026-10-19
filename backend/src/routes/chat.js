const express = require('express');
const router = express.Router();
const db = require('../db');
const gemini = require('../gemini');

// GET /api/messages - Retrieve full conversation history
router.get('/messages', async (req, res) => {
  try {
    const messages = await db.getMessages();
    return res.status(200).json(messages);
  } catch (err) {
    console.error('[Route /messages GET] Error:', err);
    return res.status(500).json({ error: 'Failed to retrieve messages from database.' });
  }
});

// POST /api/chat - Process user message, call Gemini, and store both messages
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const trimmedMessage = message.trim();

    // 1. Save user message to PostgreSQL
    const userMessage = await db.saveMessage('user', trimmedMessage);

    // 2. Fetch recent conversation history to provide context if needed
    const history = await db.getMessages();

    // 3. Request AI response from Gemini
    const replyText = await gemini.generateChatResponse(trimmedMessage, history);

    // 4. Save assistant response to PostgreSQL
    const assistantMessage = await db.saveMessage('assistant', replyText);

    return res.status(200).json({
      reply: replyText,
      userMessage,
      assistantMessage,
    });
  } catch (err) {
    console.error('[Route /chat POST] Error:', err);
    return res.status(500).json({
      error: 'An unexpected error occurred while processing the chat request.',
      details: err.message,
    });
  }
});

// DELETE /api/messages - Clear conversation history
router.delete('/messages', async (req, res) => {
  try {
    await db.clearMessages();
    return res.status(200).json({ message: 'Conversation history cleared successfully.' });
  } catch (err) {
    console.error('[Route /messages DELETE] Error:', err);
    return res.status(500).json({ error: 'Failed to clear conversation history.' });
  }
});

module.exports = router;
