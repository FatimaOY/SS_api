const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');// Get all medical records
router.get('/',auth, async (req, res) => {
  try {
    const records = await prisma.medicalrecords.findMany({
      include: {
        patients: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(records);
  } catch (error) {
    console.error("Error fetching medical records:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get medical records for a specific patient
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }
    const records = await prisma.medicalrecords.findMany({
      where: { patient_id: patientId },
      include: { patients: true },
      orderBy: { created_at: "desc" }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new medical record
router.post('/', auth,
  [
    body('patient_id').isInt().withMessage('Patient ID is required and must be an integer'),
    body('medical_condition').optional().isString(),
    body('notes').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { patient_id, medical_condition, notes } = req.body;
    try {
      const record = await prisma.medicalrecords.create({
        data: {
          patient_id: parseInt(patient_id),
          medical_condition,
          notes
        },
        include: { patients: true }
      });
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating medical record:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update a medical record
router.put('/:recordId', auth, async (req, res) => {
  const { medical_condition, notes } = req.body;

  try {
    const record = await prisma.medicalrecords.update({
      where: { record_id: parseInt(req.params.recordId) },
      data: {
        medical_condition,
        notes
      },
      include: {
        patients: true
      }
    });
    res.json(record);
  } catch (error) {
    console.error("Error updating medical record:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a medical record
router.delete('/:recordId', auth,async (req, res) => {
  try {
    await prisma.medicalrecords.delete({
      where: { record_id: parseInt(req.params.recordId) }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting medical record:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 