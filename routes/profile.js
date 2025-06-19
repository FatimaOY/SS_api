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
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update current user's profile
router.put('/:userId', auth,
    [
      body('first_name').optional().isString().trim(),
      body('last_name').optional().isString().trim(),
      body('address').optional().isString().trim(),
      body('phone').optional().isString().trim(),
      body('emergency_name').optional().isString().trim(),
      body('emergency_phone').optional().isString().trim(),
      body('medical_info').optional().isString().trim(),
      body('date_of_birth').optional().isISO8601().toDate(),
      body('gender').optional().isString().trim(),
      body('blood_type').optional().isString().trim(),
      body('allergies').optional().isString().trim(),
      body('chronic_conditions').optional().isString().trim(),
      body('current_medications').optional().isString().trim(),
      body('past_surgeries').optional().isString().trim(),
      body('primary_physician').optional().isString().trim(),
      body('physician_contact').optional().isString().trim(),
      body('preferred_pharmacy').optional().isString().trim(),
      body('insurance_provider').optional().isString().trim(),
      body('insurance_policy').optional().isString().trim(),
      body('vaccination_records').optional().isString().trim()
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }
  
  const {
    first_name,
    last_name,
    address,
    phone,
    emergency_name,
    emergency_phone,
    medical_info,
    date_of_birth,
    gender,
    blood_type,
    allergies,
    chronic_conditions,
    current_medications,
    past_surgeries,
    primary_physician,
    physician_contact,
    preferred_pharmacy,
    insurance_provider,
    insurance_policy,
    vaccination_records
  } = req.body;

  try {
    // Build update data object, only including fields that are provided
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (emergency_name !== undefined) updateData.emergency_name = emergency_name;
    if (emergency_phone !== undefined) updateData.emergency_phone = emergency_phone;
    if (medical_info !== undefined) updateData.medical_info = medical_info;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (gender !== undefined) updateData.gender = gender;
    if (blood_type !== undefined) updateData.blood_type = blood_type;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (chronic_conditions !== undefined) updateData.chronic_conditions = chronic_conditions;
    if (current_medications !== undefined) updateData.current_medications = current_medications;
    if (past_surgeries !== undefined) updateData.past_surgeries = past_surgeries;
    if (primary_physician !== undefined) updateData.primary_physician = primary_physician;
    if (physician_contact !== undefined) updateData.physician_contact = physician_contact;
    if (preferred_pharmacy !== undefined) updateData.preferred_pharmacy = preferred_pharmacy;
    if (insurance_provider !== undefined) updateData.insurance_provider = insurance_provider;
    if (insurance_policy !== undefined) updateData.insurance_policy = insurance_policy;
    if (vaccination_records !== undefined) updateData.vaccination_records = vaccination_records;

    const user = await prisma.users.update({
      where: { id: parseInt(req.params.userId) },
      data: updateData,
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
    
    res.json(user);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;