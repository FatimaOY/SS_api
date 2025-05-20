const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple in-memory rate limiting
const rateLimiter = {
  requestCounts: {},
  resetTime: 60000, // 1 minute in milliseconds
  maxRequests: 10, // Maximum requests per minute per user
  
  canMakeRequest(userId) {
    const now = Date.now();
    // Clean up old entries
    for (const id in this.requestCounts) {
      if (now - this.requestCounts[id].timestamp > this.resetTime) {
        delete this.requestCounts[id];
      }
    }
    
    // Check if user exists in our tracking
    if (!this.requestCounts[userId]) {
      this.requestCounts[userId] = {
        count: 0,
        timestamp: now
      };
    }
    
    // Check if over limit
    if (this.requestCounts[userId].count >= this.maxRequests) {
      return false;
    }
    
    // Increment count
    this.requestCounts[userId].count++;
    return true;
  }
};

// Helper for retries with exponential backoff
async function callGeminiWithRetry(prompt, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Updated model name to match current API version
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      // Updated request format to match current API
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.error(`Gemini API error: ${err.message}`);
      const delay = Math.pow(2, retries) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retries++;
      
      if (retries >= maxRetries) throw err;
    }
  }
  
  throw new Error('Maximum retries exceeded for Gemini API call');
}

// Get all voice assistant logs for a user
router.get('/users/:userId/voice-logs', auth, async (req, res) => {
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
router.post('/users/:userId/voice-logs', auth, async (req, res) => {
  const { message } = req.body;
  const user_id = req.params.userId;
  
  if (!user_id || !message) {
    return res.status(400).json({ error: 'user_id and message are required' });
  }
  
  // Apply rate limiting
  if (!rateLimiter.canMakeRequest(user_id)) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      isRateLimited: true
    });
  }

  try {
    // Create a prompt for Gemini that includes system and user messages
    const prompt = `You are a helpful assistant for Smart Safety, a health monitoring app. 
    Provide concise, helpful responses to user queries about health, safety, and emergency situations.
    
    User query: ${message}`;
    
    // Call Gemini API with retry mechanism
    const responseText = await callGeminiWithRetry(prompt);

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
    console.error('Gemini API Error:', err.message);
    
    // Handle different error types
    if (err.message && (err.message.includes('rate limit') || err.message.includes('quota'))) {
      return res.status(429).json({ 
        error: 'Gemini API rate limit exceeded. Please try again later.',
        isRateLimited: true
      });
    }
    
    // Fallback response for users
    const fallbackResponse = "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment.";
    
    try {
      // Save error log with fallback response
      const log = await prisma.voiceassistantlogs.create({
        data: {
          user_id: parseInt(user_id),
          message,
          response: fallbackResponse,
          error: err.message.substring(0, 255) // Truncate if too long
        }
      });
      
      res.status(200).json({
        ...log,
        isError: true,
        response: fallbackResponse
      });
    } catch (dbErr) {
      res.status(500).json({ 
        error: 'Failed to process your request and log the error.',
        details: err.message
      });
    }
  }
});

module.exports = router;