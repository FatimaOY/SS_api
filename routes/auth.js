const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Register
router.post('/register', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isString(),
  body('first_name').optional().isString(),
  body('last_name').optional().isString(),
  body('address').optional().isString(),
  body('phone').optional().isString(),
  body('emergency_name').optional().isString(),
  body('emergency_phone').optional().isString(),
  body('medical_info').optional().isString()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    email,
    password,
    role,
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

  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.users.create({
      data: {
        email,
        password: hashed,
        role,
        first_name,
        last_name,
        address,
        phone,
        emergency_name,
        emergency_phone,
        medical_info,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
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
        vaccination_records,
      }
    });

    // Create patient or caregiver record based on role
    if (role === 'patient') {
      await prisma.patients.create({
        data: { user_id: user.id }
      });
    } else if (role === 'caregiver') {
      await prisma.caregivers.create({
        data: { user_id: user.id }
      });
    }

    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Login
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').exists().withMessage('Password is required')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  const { email, password } = req.body;
  const user = await prisma.users.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Authentication middleware
const authenticateToken = function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 👉 this will contain user.id and user.email
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Invalid token.' });
  }
};

module.exports = router;