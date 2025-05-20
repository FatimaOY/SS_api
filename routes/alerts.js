const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const deviceAuth = require('../routes/middleware/deviceAuth');

// Setup mail transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get alerts for a specific user
router.get('/', async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ error: 'Missing userId in query' });

  try {
    const alerts = await prisma.alerts.findMany({
      where: { user_id: userId },
      include: { users: true, devices: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(alerts);
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Web-based alert creation
router.post(
  '/',
  [
    body('message').isString(),
    body('device_id').isInt(),
    body('lat').optional().isFloat(),
    body('lng').optional().isFloat()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { message, lat, lng, device_id } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const alert = await prisma.alerts.create({
        data: {
          message,
          lat: lat ?? null,
          lng: lng ?? null,
          device_id,
          user_id: userId,
          handled: false
        },
        include: { users: true, devices: true }
      });

      await sendNotifications(alert);
      res.status(201).json({ message: '🚨 Alert triggered and notifications sent!', alert });
    } catch (err) {
      console.error("❌ Error creating alert:", err);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }
);

// Device-based alert (Arduino) using secure token
router.post('/from-device', deviceAuth, async (req, res) => {
  const { message, lat, lng, device_id, user_id } = req.body;

  if (!message || !device_id || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = await prisma.users.findUnique({ where: { id: parseInt(user_id) } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const alert = await prisma.alerts.create({
    data: {
      message,
      lat: lat ?? null,
      lng: lng ?? null,
      device_id,
      user_id,
      handled: false
    },
    include: {
      users: true,
      devices: true
    }
  });

  await sendNotifications(alert);
  res.status(201).json({ message: 'Alert created', alert });
});


// Shared notification logic
async function sendNotifications(alert) {
  const { users: user, devices, message, lat, lng, created_at } = alert;
  if (!user?.email) return;

  const userName = `${user.first_name || 'Unknown'} ${user.last_name || ''}`.trim();
  const locationUrl = lat && lng ? `\nLocation: https://maps.google.com/?q=${lat},${lng}` : '';

  // Notify primary user
  await transporter.sendMail({
    from: 'alert@yourdomain.com',
    to: user.email,
    subject: '🚨 Emergency Alert Triggered',
    text: `User ${userName} triggered an emergency on device ${devices.id} at ${created_at?.toISOString()}${locationUrl}`
  });

  // Notify caregivers
  const patient = await prisma.patients.findFirst({
    where: { user_id: user.id },
    include: {
      caregiverpatientlinks: {
        include: {
          caregivers: {
            include: { users: true }
          }
        }
      }
    }
  });

  const caregivers = patient
    ? patient.caregiverpatientlinks.map(link => link.caregivers.users)
    : [];

  for (const caregiver of caregivers) {
    if (caregiver.email) {
      await transporter.sendMail({
        from: 'alert@yourdomain.com',
        to: caregiver.email,
        subject: '🚨 Emergency Alert Triggered',
        text: `User ${user.email} triggered an emergency on device ${devices.id} at ${created_at?.toISOString()}`
      });
    }

    if (caregiver.fcm_token) {
      await admin.messaging().send({
        notification: {
          title: '🚨 Emergency Alert',
          body: message
        },
        token: caregiver.fcm_token
      });
    }
  }
}

// Mark alert as handled
router.put('/:id', async (req, res) => {
  try {
    const alert = await prisma.alerts.update({
      where: { id: parseInt(req.params.id) },
      data: { handled: true },
      include: { devices: true, users: true }
    });
    res.json(alert);
  } catch (err) {
    console.error("Error updating alert:", err);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Delete alert
router.delete('/:id', async (req, res) => {
  try {
    await prisma.alerts.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting alert:", err);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

module.exports = router;
