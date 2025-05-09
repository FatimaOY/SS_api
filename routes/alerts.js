const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all alerts
router.get('/', async (req, res) => {
  try {
    const alerts = await prisma.alerts.findMany({
      include: {
        devices: true
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
        devices: true
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
  const { message, lat, lng, device_id } = req.body;

  if (!message || !device_id) {
    return res.status(400).json({ error: 'Message and device_id are required' });
  }

  try {
    const alert = await prisma.alerts.create({
      data: {
        message,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        device_id: parseInt(device_id)
      },
      include: {
        devices: true
      }
    });
    res.status(201).json(alert);
  } catch (err) {
    console.error("Error creating alert:", err);
    res.status(500).json({ error: 'Failed to create alert' });
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
