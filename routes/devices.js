const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth'); // Get all devices
router.get('/', auth, async (req, res) => {
  try {
    const devices = await prisma.devices.findMany({
      include: {
        patients: {
          include: {
            users: true // ✅ get patient name/email
          }
        },
        alerts: true,
        gps_locations: true
      }
    });
    res.json(devices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({ error: error.message });
  }
});


// Get device by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const device = await prisma.devices.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        patients: {
          include: {
            users: true
          }
        },
        alerts: true,
        gps_locations: true
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
router.get('/mac/:mac', auth, async (req, res) => {
  try {
    const device = await prisma.devices.findUnique({
      where: { mac: req.params.mac },
      include: {
        patients: {
          include: {
            users: true
          }
        },
        alerts: true,
        gps_locations: true
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

// GET /api/devices/by-mac/:mac
// GET /api/devices/by-mac/:mac
router.get('/by-mac/:mac', async (req, res) => {
  try {
    const mac = req.params.mac;
    const device = await prisma.devices.findUnique({
      where: { mac },
      select: {
        id: true,
        patient_id: true  // ✅ this is the new field you added in your schema
      }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      device_id: device.id,
      patient_id: device.patient_id
    });
  } catch (err) {
    console.error("🔥 Error fetching device by MAC:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// Create a new device
router.post('/', auth,
  [
    body('mac').isString().withMessage('MAC address is required'),
    body('patient_id').isInt().withMessage('Patient ID is required and must be an integer'),
    body('name').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { mac, name, patient_id } = req.body;
    try {
      const device = await prisma.devices.create({
        data: {
          mac,
          name: name || null,
          patient_id: parseInt(patient_id)
        },
        include: {
          patients: {
            include: {
              users: true
            }
          }
        }
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
  const { name, patient_id } = req.body;

  try {
    const device = await prisma.devices.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name: name || undefined,
        patient_id: patient_id ? parseInt(patient_id) : undefined
      },
      include: {
        patients: {
          include: {
            users: true
          }
        },
        alerts: true,
        gps_locations: true
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

router.post('/register', auth, async (req, res) => {
  const { mac } = req.body;
  const userId = req.user.id;

  if (!mac) {
    return res.status(400).json({ error: 'MAC address is required' });
  }

  try {
    // Find the patient record for this user
    const patient = await prisma.patients.findFirst({
      where: { user_id: userId }
    });

    if (!patient) {
      return res.status(400).json({ error: 'User is not registered as a patient' });
    }

    let device = await prisma.devices.findUnique({ where: { mac } });

    if (device) {
      // Reassign device to this patient
      device = await prisma.devices.update({
        where: { id: device.id },
        data: { patient_id: patient.id }
      });
    } else {
      // Create new device if it doesn't exist
      device = await prisma.devices.create({
        data: { 
          mac, 
          patient_id: patient.id 
        }
      });
    }

    res.status(200).json({
      message: '✅ Device registered and assigned to current patient',
      device_id: device.id,
      patient_id: patient.id
    });
  } catch (error) {
    console.error("❌ Error in /devices/register:", error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});





module.exports = router; 