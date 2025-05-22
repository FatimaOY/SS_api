const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

// Get all voice assistant logs for a user
router.get('/users/:userId/voice-logs', async (req, res) => {
  try {
    const logs = await prisma.voiceassistantlogs.findMany({
      where: { user_id: parseInt(req.params.userId) },
      orderBy: { timestamp: 'desc' }
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log a new voice assistant command/response with integration
router.post('/users/:userId/voice-logs', async (req, res) => {
    const { message } = req.body;
    const user_id = req.params.userId;
    if (!user_id || !message) {
      return res.status(400).json({ error: 'user_id and message are required' });
    }
  
    try {
      // Call OpenAI GPT API (replace with your API key and endpoint)
      const openaiResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: message }]
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      const responseText = openaiResponse.data.choices[0].message.content;
  
      // Save log to DB
      const log = await prisma.voiceassistantlogs.create({
        data: {
          user_id: parseInt(user_id),
          message,
          response: responseText
        }
      });
  
      res.status(201).json(log);
    } catch (err) {
        console.error(err); // Log the error for debugging

      res.status(500).json({ error: err.message });
    }
  });
  
  module.exports = router;