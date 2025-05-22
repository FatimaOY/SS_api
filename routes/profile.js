const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
// Get current user's profile
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(req.params.userId) },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        address: true,
        phone: true,
        emergency_name: true,
        emergency_phone: true,
        medical_info: true,
        date_of_birth: true,
        gender: true,
        blood_type: true,
        allergies: true,
        chronic_conditions: true,
        current_medications: true,
        past_surgeries: true,
        primary_physician: true,
        physician_contact: true,
        preferred_pharmacy: true,
        insurance_provider: true,
        insurance_policy: true,
        vaccination_records: true,
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update current user's profile
router.put('/:userId', auth,
    [
      body('first_name').optional().isString(),
      body('last_name').optional().isString(),
      body('address').optional().isString(),
      body('phone').optional().isString(),
      body('emergency_name').optional().isString(),
      body('emergency_phone').optional().isString(),
      body('medical_info').optional().isString()
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  const {
    first_name,
    last_name,
    address,
    phone,
    emergency_name,
    emergency_phone,
    medical_info
  } = req.body;

  try {
    const user = await prisma.users.update({
      where: { id: parseInt(req.params.userId) },
      data: {
        first_name,
        last_name,
        address,
        phone,
        emergency_name,
        emergency_phone,
        medical_info,
        date_of_birth: req.body.date_of_birth ? new Date(req.body.date_of_birth) : undefined,
        gender: req.body.gender,
        blood_type: req.body.blood_type,
        allergies: req.body.allergies,
        chronic_conditions: req.body.chronic_conditions,
        current_medications: req.body.current_medications,
        past_surgeries: req.body.past_surgeries,
        primary_physician: req.body.primary_physician,
        physician_contact: req.body.physician_contact,
        preferred_pharmacy: req.body.preferred_pharmacy,
        insurance_provider: req.body.insurance_provider,
        insurance_policy: req.body.insurance_policy,
        vaccination_records: req.body.vaccination_records

      }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;