const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get all alerts
router.get('/', auth, async (req, res) => {
  try {
    const alerts = await prisma.alerts.findMany({
      include: {
        devices: true,
        // users: true
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
router.get('/device/:deviceId', auth, async (req, res) => {
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

// Create a new alert (standardized)
router.post('/', auth,
  [
    body('message').isString().withMessage('Message is required'),
    body('device_id').isInt().withMessage('Device ID is required and must be an integer'),
    body('user_id').isInt().withMessage('User ID is required and must be an integer'),
    body('lat').optional().isFloat(),
    body('lng').optional().isFloat()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { message, lat, lng, device_id, user_id } = req.body;

  if (!message || !device_id || !user_id) {
    return res.status(400).json({ error: 'Message, device_id, and user_id are required' });
  }

  try {
    // 1. Create alert in DB
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

    
    // Safe access to user email and name
    const userEmail = alert.users?.email || 'admin@example.com';
    const userName = `${alert.users?.FirstName || 'Unknown'} ${alert.users?.LastName || ''}`;
    const locationUrl = (lat && lng) ? `\nLocation: https://maps.google.com/?q=${lat},${lng}` : '';

    await transporter.sendMail({
      from: 'alert@yourdomain.com',
      to: userEmail,
      subject: '🚨 Emergency Alert Triggered',
      text: `User ${userName} triggered an emergency on device ${device_id} at ${alert.created_at?.toISOString()}${locationUrl}`
    });

    //  Find all caregivers for this user (assuming patient-caregiver links)
    const patient = await prisma.patients.findFirst({
      where: { user_id: parseInt(user_id) },
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

    // 3. Send email and push notifications to each caregiver
    for (const caregiver of caregivers) {
      // Email
      if (caregiver.email) {
        await transporter.sendMail({
          from: 'alert@yourdomain.com',
          to: caregiver.email,
          subject: '🚨 Emergency Alert Triggered',
          text: `User ${alert.users.email} triggered an emergency on device ${device_id} at ${alert.created_at?.toISOString()}`
        });
      }
      // Push notification
      if (caregiver.fcm_token) {
        await admin.messaging().send({
          notification: {
            title: '🚨 Emergency Alert',
            body: message,
          },
          token: caregiver.fcm_token,
        });
      }
    }

    res.status(201).json({
      message: '🚨 Emergency alert triggered and notifications sent!',
      alert
    });
  } catch (err) {
    console.error("❌ Error creating alert:", err);
    res.status(500).json({
      error: 'Failed to create alert',
      message: err.message,
      stack: err.stack
    });
  }
});

// Delete an alert
router.delete('/:id',auth, async (req, res) => {
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
