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

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const alerts = await prisma.alerts.findMany({
      include: {
        devices: true,
        users: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(alerts);
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alerts for a specific device
router.get('/device/:deviceId', async (req, res) => {
  try {
    const alerts = await prisma.alerts.findMany({
      where: {
        device_id: parseInt(req.params.deviceId)
      },
      include: {
        devices: true,
        users: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(alerts);
  } catch (err) {
    console.error("Error fetching device alerts:", err);
    res.status(500).json({ error: 'Failed to fetch device alerts' });
  }
});

// Create a new alert
router.post('/', async (req, res) => {
  const { message, lat, lng, device_id, user_id } = req.body;

  if (!message || !device_id || !user_id) {
    return res.status(400).json({ error: 'Message, device_id, and user_id are required' });
  }

  try {
    const alert = await prisma.alerts.create({
      data: {
        message,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        device_id: parseInt(device_id),
        user_id: parseInt(user_id),
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
      text: `User ${alert.users.FirstName} ${alert.users.LastName} triggered an emergency on device ${device_id} at ${alert.created_at?.toISOString()}`
    });

    res.status(201).json({
      message: '🚨 Emergency alert triggered and email sent!',
      alert
    });
  } catch (err) {
    console.error("Error creating alert:", err);
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

// Delete an alert
router.delete('/:id', async (req, res) => {
  try {
    await prisma.alerts.delete({
      where: {
        id: parseInt(req.params.id)
      }
    });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting alert:", err);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

module.exports = router;
