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
    body('role').isIn(['patient', 'caregiver']).withMessage('Role must be either patient or caregiver'),
    body('first_name').optional().isString().withMessage('First name must be a string'),
    body('last_name').optional().isString().withMessage('Last name must be a string')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
    const { email, password, role, first_name, last_name } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    
    try {
      // Create user first
      const user = await prisma.users.create({ 
        data: { 
          email, 
          password: hashed,
          first_name,
          last_name
        } 
      });

      // Create role-specific record based on role
      if (role === 'patient') {
        await prisma.patients.create({
          data: { user_id: user.id }
        });
      } else if (role === 'caregiver') {
        await prisma.caregivers.create({
          data: { user_id: user.id }
        });
      }

      res.status(201).json({ 
        id: user.id, 
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: role 
      });
    } catch (err) {
      // If anything fails, try to clean up the user record
      if (user) {
        await prisma.users.delete({ where: { id: user.id } });
      }
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

module.exports = router;