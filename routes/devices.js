const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
// Get all devices
router.get('/',auth, async (req, res) => {
  try {
    const devices = await prisma.devices.findMany({
      include: {
        users: true,
        alerts: true
      }
    });
    res.json(devices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get device by ID
router.get('/:id',auth, async (req, res) => {
  try {
    const device = await prisma.devices.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        users: true,
        alerts: true
      }
    });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error("Error fetching device:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get device by MAC address
router.get('/mac/:mac',auth, async (req, res) => {
  try {
    const device = await prisma.devices.findUnique({
      where: { mac: req.params.mac },
      include: {
        users: true,
        alerts: true
      }
    });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json(device);
  } catch (error) {
    console.error("Error fetching device:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new device
router.post('/', auth,
  [
    body('mac').isString().withMessage('MAC address is required'),
    body('user_id').optional().isInt().withMessage('User ID must be an integer'),
    body('name').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { mac, name, user_id } = req.body;
    try {
      const device = await prisma.devices.create({
        data: {
          mac,
          name: name || null,
          user_id: user_id ? parseInt(user_id) : null
        },
        include: { users: true }
      });
      res.status(201).json(device);
    } catch (error) {
      console.error("Error creating device:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update a device
router.put('/:id', auth, async (req, res) => {
  const { name, user_id } = req.body;

  try {
    const device = await prisma.devices.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: name || undefined,
        user_id: user_id ? parseInt(user_id) : undefined
      },
      include: {
        users: true
      }
    });
    res.json(device);
  } catch (error) {
    console.error("Error updating device:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get device's alerts
router.get('/:id/alerts',auth, async (req, res) => {
  try {
    const alerts = await prisma.alerts.findMany({
      where: { device_id: parseInt(req.params.id) },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(alerts);
  } catch (error) {
    console.error("Error fetching device alerts:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a device
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.devices.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting device:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 