const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /alerts — trigger a new emergency alert
router.post('/', async (req, res) => {
  const { user_id, device_id } = req.body;

  try {
    const alert = await prisma.emergency_alerts.create({
      data: {
        user_id,
        device_id,
        handled: false
      }
    });

    res.status(201).json({
      message: '🚨 Emergency alert triggered!',
      alert
    });
  } catch (err) {
    console.error("🔥 Error creating alert:", err);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

module.exports = router;
