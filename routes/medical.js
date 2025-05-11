const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all medical records
router.get('/', async (req, res) => {
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
router.get('/patient/:patientId', async (req, res) => {
  try {
    const records = await prisma.medicalrecords.findMany({
      where: { patient_id: parseInt(req.params.patientId) },
      include: {
        patients: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(records);
  } catch (error) {
    console.error("Error fetching patient medical records:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new medical record
router.post('/', async (req, res) => {
  const { patient_id, medical_condition, notes } = req.body;

  if (!patient_id) {
    return res.status(400).json({ error: 'Patient ID is required' });
  }

  try {
    const record = await prisma.medicalrecords.create({
      data: {
        patient_id: parseInt(patient_id),
        medical_condition,
        notes
      },
      include: {
        patients: true
      }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error("Error creating medical record:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a medical record
router.put('/:recordId', async (req, res) => {
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
router.delete('/:recordId', async (req, res) => {
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