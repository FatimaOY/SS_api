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

// Get events for caregivers (their own events + their patients' events)
router.get('/caregiver', auth, async (req, res) => {
  try {
    // First check if the user is a caregiver
    const caregiver = await prisma.caregivers.findFirst({
      where: { user_id: req.user.id }
    });

    if (!caregiver) {
      return res.status(403).json({ error: 'User is not a caregiver' });
    }

    // Get caregiver's own events
    const caregiverEvents = await prisma.events.findMany({
      where: { user_id: req.user.id },
      include: { 
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    // Get all patients linked to this caregiver
    const patientLinks = await prisma.caregiverpatientlinks.findMany({
      where: { caregiver_id: caregiver.id },
      include: {
        patients: {
          include: {
            users: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Get events for all linked patients
    const patientIds = patientLinks.map(link => link.patients.user_id);
    const patientEvents = await prisma.events.findMany({
      where: {
        user_id: {
          in: patientIds
        }
      },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    // Combine and organize events
    const allEvents = [
      ...caregiverEvents.map(event => ({
        ...event,
        event_owner: 'caregiver',
        owner_name: `${event.users.first_name} ${event.users.last_name} (You)`
      })),
      ...patientEvents.map(event => ({
        ...event,
        event_owner: 'patient',
        owner_name: `${event.users.first_name} ${event.users.last_name} (Patient)`
      }))
    ];

    // Sort events by start time
    allEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    res.json(allEvents);
  } catch (err) {
    console.error("Error fetching caregiver events:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get events for a specific patient (for caregiver view)
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    
    // Verify the caregiver has access to this patient
    const caregiver = await prisma.caregivers.findFirst({
      where: { user_id: req.user.id }
    });

    if (!caregiver) {
      return res.status(403).json({ error: 'User is not a caregiver' });
    }

    const patientLink = await prisma.caregiverpatientlinks.findFirst({
      where: {
        caregiver_id: caregiver.id,
        patient_id: patientId
      }
    });

    if (!patientLink) {
      return res.status(403).json({ error: 'Access denied to this patient' });
    }

    // Get the patient's user ID
    const patient = await prisma.patients.findUnique({
      where: { id: patientId },
      include: { users: true }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get events for this specific patient
    const events = await prisma.events.findMany({
      where: { user_id: patient.user_id },
      include: {
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    // Add owner information
    const eventsWithOwner = events.map(event => ({
      ...event,
      event_owner: 'patient',
      owner_name: `${event.users.first_name} ${event.users.last_name} (Patient)`
    }));

    res.json(eventsWithOwner);
  } catch (err) {
    console.error("Error fetching patient events:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;