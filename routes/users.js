const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      include: {
        devices: true,
        events: true,
        caregivers: true,
        patients: true
      }
    });
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        devices: true,
        events: true,
        caregivers: true,
        patients: true
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST create a new user
router.post('/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fcm_token').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, fcm_token } = req.body;
    try {
      const user = await prisma.users.create({
        data: { email, password, fcm_token }
      });
      res.status(201).json(user);
    } catch (err) {
      console.error("Error creating user:", err);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// PUT update user
router.put('/:id', auth,
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fcm_token').optional().isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, fcm_token } = req.body;
    try {
      const user = await prisma.users.update({
        where: { id: parseInt(req.params.id) },
        data: { email, password, fcm_token }
      });
      res.json(user);
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// DELETE user
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.users.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
