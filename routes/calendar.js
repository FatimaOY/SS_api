const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { body, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const auth = require('../middleware/auth');

// ✅ Create a new event using user ID from token
router.post('/', auth, async (req, res) => {
  const { title, description, start_time, end_time, type } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const event = await prisma.events.create({
      data: {
        user_id: req.user.id, // ✅ from token
        title,
        description,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
        type


      },
      include: {
        users: true
      }

    });
    console.log("Fetched events:", this.events);
    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get events for a specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const events = await prisma.events.findMany({
      where: { user_id: parseInt(req.params.userId) },
      include: {
        users: true
      }
    });
    res.json(events);
  } catch (error) {
    console.error("Error fetching user events:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update an event
router.put('/:eventId', auth, async (req, res) => {
  const { title, description, start_time, end_time, type } = req.body;

  try {
    const event = await prisma.events.update({
      where: { event_id: parseInt(req.params.eventId) },
      data: {
        title,
        description,
        start_time: start_time ? new Date(start_time) : undefined,
        end_time: end_time ? new Date(end_time) : undefined,
        type
      },
      include: {
        users: true
      }
    });
    res.json(event);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an event
router.delete('/:eventId', auth, async (req, res) => {
  try {
    await prisma.events.delete({
      where: { event_id: parseInt(req.params.eventId) }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: error.message });
  }
});



// Get events for the authenticated user
router.get('/me', auth, async (req, res) => {
  try {
    const events = await prisma.events.findMany({
      where: { user_id: req.user.id },
      include: { users: true }
    });
    res.json(events);
  } catch (err) {
    console.error("Error fetching events for authenticated user:", err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;