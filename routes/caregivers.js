const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');

// Get all caregivers
router.get('/', async (req, res) => {
  try {
    const caregivers = await prisma.caregivers.findMany({
      include: {
        users: true,
        caregiverpatientlinks: {
          include: {
            patients: true
          }
        }
      }
    });
    res.json(caregivers);
  } catch (error) {
    console.error("Error fetching caregivers:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get caregiver by ID
router.get('/:id', async (req, res) => {
  try {
    const caregiver = await prisma.caregivers.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        users: true,
        caregiverpatientlinks: {
          include: {
            patients: true
          }
        }
      }
    });
    if (!caregiver) {
      return res.status(404).json({ error: 'Caregiver not found' });
    }
    res.json(caregiver);
  } catch (error) {
    console.error("Error fetching caregiver:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new caregiver
router.post('/',
  [
    body('user_id').isInt().withMessage('User ID is required and must be an integer')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { user_id } = req.body;
    try {
      const caregiver = await prisma.caregivers.create({
        data: { user_id: parseInt(user_id) },
        include: { users: true }
      });
      res.status(201).json(caregiver);
    } catch (error) {
      console.error("Error creating caregiver:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Link caregiver to patient
router.post('/:id/patients',
  [
    body('patient_id').isInt().withMessage('Patient ID is required and must be an integer')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { patient_id } = req.body;
    try {
      const link = await prisma.caregiverpatientlinks.create({
        data: {
          caregiver_id: parseInt(req.params.id),
          patient_id: parseInt(patient_id)
        },
        include: { patients: true }
      });
      res.status(201).json(link);
    } catch (error) {
      console.error("Error linking caregiver to patient:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Unlink caregiver from patient
router.delete('/:id/patients/:patientId', async (req, res) => {
  try {
    await prisma.caregiverpatientlinks.deleteMany({
      where: {
        caregiver_id: parseInt(req.params.id),
        patient_id: parseInt(req.params.patientId)
      }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error unlinking caregiver from patient:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a caregiver
router.delete('/:id', async (req, res) => {
  try {
    await prisma.caregivers.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting caregiver:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 