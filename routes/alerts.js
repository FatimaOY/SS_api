const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST /alerts — trigger a new emergency alert
router.post('/', async (req, res) => {
  const { user_id, device_id } = req.body;

  try {
    const alert = await prisma.emergency_alerts.create({
      data: {
        user_id,
        device_id,
        handled: false
      },
      include: {
        users: true,
        devices: true
      }
    });
    // Send email notification
    await transporter.sendMail({
      from: 'alert@yourdomain.com',
      to: alert.users.email || 'admin@example.com',
      subject: '🚨 Emergency Alert Triggered',
      text: `User ${alert.users.FirstName} ${alert.users.LastName} triggered an emergency on device ${device_id} at ${alert.timestamp?.toISOString()}`
    });

    res.status(201).json({
      message: '🚨 Emergency alert triggered and email sent!',
      alert
    });
  } catch (err) {
    console.error("🔥 Error creating alert:", err);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// GET /alerts — retrieve emergency alert history
router.get('/', async (req, res) => {
  try {
    const alerts = await prisma.emergency_alerts.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        users: true,
        devices: true
      }
    });

    res.status(200).json({ alerts });
  } catch (err) {
    console.error("🔥 Error fetching alerts:", err);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});


module.exports = router;
