const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');

router.get('/', async (req, res) => {
  const { user_id } = req.query;
  try {
    if (user_id) {
      const patients = await prisma.patients.findMany({
        where: { user_id: parseInt(user_id) },
        include: {
          users: true,
          caregiverpatientlinks: { include: { caregivers: true } },
          medicalrecords: true
        }
      });
      return res.json(patients);
    } else {
      const patients = await prisma.patients.findMany({
        include: {
          users: true,
          caregiverpatientlinks: { include: { caregivers: true } },
          medicalrecords: true
        }
      });
      return res.json(patients);
    }
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ error: error.message });
  }
});
// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const patient = await prisma.patients.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        users: true,
        caregiverpatientlinks: {
          include: {
            caregivers: true
          }
        },
        medicalrecords: true
      }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new patient
router.post('/',
  [
    body('user_id').isInt().withMessage('User ID is required and must be an integer')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { user_id } = req.body;
    try {
      const patient = await prisma.patients.create({
        data: { user_id: parseInt(user_id) },
        include: { users: true }
      });
      res.status(201).json(patient);
    } catch (error) {
      console.error("Error creating patient:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get patient's caregivers
router.get('/:id/caregivers', async (req, res) => {
  try {
    const patient = await prisma.patients.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        caregiverpatientlinks: {
          include: {
            caregivers: {
              include: {
                users: true
              }
            }
          }
        }
      }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient.caregiverpatientlinks.map(link => link.caregivers));
  } catch (error) {
    console.error("Error fetching patient's caregivers:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get patient's medical records
router.get('/:id/medical-records', async (req, res) => {
  try {
    const records = await prisma.medicalrecords.findMany({
      where: { patient_id: parseInt(req.params.id) },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(records);
  } catch (error) {
    console.error("Error fetching patient's medical records:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a patient
router.delete('/:id', async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    // Delete related medical records
    await prisma.medicalrecords.deleteMany({ where: { patient_id: patientId } });
    // Delete related caregiver links
    await prisma.caregiverpatientlinks.deleteMany({ where: { patient_id: patientId } });
    // Now delete the patient
    await prisma.patients.delete({ where: { id: patientId } });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 