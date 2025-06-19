const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require('firebase-admin');
const { body, validationResult } = require('express-validator');
const deviceAuth = require('./middleware/deviceAuth');
const auth = require('../middleware/auth');

// Setup mail transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get alerts for a specific patient
router.get('/', auth, async (req, res) => {
  const patientId = parseInt(req.query.patientId || req.query.patient_id);
  if (!patientId) {
    // If no patient ID provided, return all alerts (for caregivers)
    try {
      const alerts = await prisma.alerts.findMany({
        include: { 
          devices: {
            include: {
              patients: {
                include: {
                  users: true
                }
              }
            }
          },
          patients: {
            include: {
              users: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
      res.json(alerts);
    } catch (err) {
      console.error("Error fetching all alerts:", err);
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
    return;
  }

  try {
    const alerts = await prisma.alerts.findMany({
      where: { patient_id: patientId },
      include: { 
        devices: {
          include: {
            patients: {
              include: {
                users: true
              }
            }
          }
        },
        patients: {
          include: {
            users: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(alerts);
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alerts for the current user's patient record
router.get('/my-alerts', auth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Find the patient record for this user
    const patient = await prisma.patients.findFirst({
      where: { user_id: userId }
    });

    if (!patient) {
      return res.status(404).json({ error: 'No patient record found for this user' });
    }

    const alerts = await prisma.alerts.findMany({
      where: { patient_id: patient.id },
      include: { 
        devices: {
          include: {
            patients: {
              include: {
                users: true
              }
            }
          }
        },
        patients: {
          include: {
            users: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(alerts);
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get alerts for all patients linked to a caregiver
router.get('/for-caregiver', auth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Find the caregiver record for this user
    const caregiver = await prisma.caregivers.findFirst({
      where: { user_id: userId }
    });

    if (!caregiver) {
      return res.status(404).json({ error: 'No caregiver record found for this user' });
    }

    // Get all patients linked to this caregiver
    const linkedPatients = await prisma.caregiverpatientlinks.findMany({
      where: { caregiver_id: caregiver.id },
      include: {
        patients: true
      }
    });

    const patientIds = linkedPatients.map(link => link.patient_id);

    if (patientIds.length === 0) {
      return res.json([]);
    }

    // Get alerts for all linked patients
    const alerts = await prisma.alerts.findMany({
      where: { 
        patient_id: { in: patientIds }
      },
      include: { 
        devices: {
          include: {
            patients: {
              include: {
                users: true
              }
            }
          }
        },
        patients: {
          include: {
            users: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(alerts);
  } catch (err) {
    console.error("Error fetching caregiver alerts:", err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Get a single alert by ID
router.get('/:id', auth, async (req, res) => {
  const alertId = parseInt(req.params.id);
  if (isNaN(alertId)) {
    return res.status(400).json({ error: 'Invalid alert ID' });
  }

  try {
    const alert = await prisma.alerts.findUnique({
      where: { id: alertId },
      include: {
        devices: true,
        patients: {
          include: { users: true }
        }
      }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (err) {
    console.error("Error fetching alert:", err);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

// Web-based alert creation
router.post(
  '/',
  [
    body('message').isString(),
    body('device_id').isInt(),
    body('patient_id').isInt(),
    body('lat').optional().isFloat(),
    body('lng').optional().isFloat()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { message, lat, lng, device_id, patient_id } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      // Verify the patient exists and belongs to the user
      const patient = await prisma.patients.findFirst({
        where: { 
          id: parseInt(patient_id),
          user_id: userId
        },
        include: {
          users: true,
          caregiverpatientlinks: {
            include: {
              caregivers: {
                include: { users: true }
              }
            }
          }
        }
      });

      if (!patient) {
        return res.status(403).json({ error: 'Patient not found or unauthorized' });
      }

      const alert = await prisma.alerts.create({
        data: {
          message,
          lat: lat ?? null,
          lng: lng ?? null,
          device_id,
          patient_id: parseInt(patient_id),
          handled: false
        },
        include: { 
          devices: true,
          patients: {
            include: {
              users: true,
              caregiverpatientlinks: {
                include: {
                  caregivers: {
                    include: { users: true }
                  }
                }
              }
            }
          }
        }
      });

      await sendNotifications(alert, patient);
      res.status(201).json({ message: '🚨 Alert triggered and notifications sent!', alert });
    } catch (err) {
      console.error("❌ Error creating alert:", err);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }
);

// Device-based alert (Arduino) using secure token
router.post('/from-device', deviceAuth, async (req, res) => {
  const { message, lat, lng, device_id, patient_id } = req.body;

  if (!message || !device_id || !patient_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Find patient
  const patient = await prisma.patients.findUnique({
    where: { id: parseInt(patient_id) },
    include: {
      users: true,
      caregiverpatientlinks: {
        include: {
          caregivers: {
            include: { users: true }
          }
        }
      }
    }
  });

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const alert = await prisma.alerts.create({
    data: {
      message,
      lat: lat ?? null,
      lng: lng ?? null,
      device_id,
      patient_id: parseInt(patient_id),
      handled: false
    },
    include: {
      devices: true,
      patients: {
        include: {
          users: true
        }
      }
    }
  });

  await sendNotifications(alert, patient);
  res.status(201).json({ message: 'Alert created', alert });
});


// Shared notification logic
async function sendNotifications(alert, patient) {
  const { message, lat, lng, created_at, devices } = alert;
  const user = patient.users;

  const userName = `${user.first_name || 'Unknown'} ${user.last_name || ''}`.trim();
  const locationUrl = lat && lng ? `\nLocation: https://maps.google.com/?q=${lat},${lng}` : '';

  // Notify the patient themselves
  if (user.email) {
    await transporter.sendMail({
      from: 'alert@yourdomain.com',
      to: user.email,
      subject: '🚨 Emergency Alert Triggered',
      text: `User ${userName} triggered an emergency on device ${devices.id} at ${created_at?.toISOString()}${locationUrl}`
    });
  }

  // Notify caregivers
  const caregivers = patient.caregiverpatientlinks.map(link => link.caregivers.users);

  for (const caregiver of caregivers) {
    if (caregiver.email) {
      await transporter.sendMail({
        from: 'alert@yourdomain.com',
        to: caregiver.email,
        subject: '🚨 Emergency Alert Triggered',
        text: `Patient ${userName} triggered an emergency on device ${devices.id} at ${created_at?.toISOString()}${locationUrl}`
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
      include: { 
        devices: true,
        patients: {
          include: {
            users: true
          }
        }
      }
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
