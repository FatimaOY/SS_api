const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET all users
router.get('/', async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      include: { roles: true }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST create a new user
router.post('/', async (req, res) => {
  const { FirstName, LastName, email, password, role_id } = req.body;
  console.log("📦 Received POST data:", req.body);

  try {
    const user = await prisma.users.create({
      data: {
        FirstName,
        LastName,
        email,
        password,
        role_id
      }
    });    
    res.status(201).json(user);
  } catch (err) {
    console.error("🔥 Error creating user:", err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});



// PUT update user by ID
router.put('/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { FirstName, LastName, email, password, role_id } = req.body;
  try {
    const user = await prisma.users.update({
      where: { user_id: userId },
      data: { FirstName, LastName, email, password, role_id }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE user by ID
router.delete('/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    await prisma.users.delete({ where: { user_id: userId } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
