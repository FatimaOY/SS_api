const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
const auth = require('../middleware/auth');

// Get GPS history for a device
router.get('/devices/:id/locations', async (req, res) => {
  try {
    const locations = await prisma.gps_locations.findMany({
      where: { device_id: parseInt(req.params.id) },
      orderBy: { timestamp: 'desc' }
    });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get route between two points using Google Maps Directions API
router.get('/route', async (req, res) => {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination are required' });
    }
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: {
          origin,
          destination,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });
      res.json(response.data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

// Add a new GPS location for a device
router.post('/devices/:id/locations', auth, async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;
  if (latitude == null || longitude == null) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }
  try {
    const location = await prisma.gps_locations.create({
      data: {
        device_id: parseInt(req.params.id),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null
      }
    });
    res.status(201).json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get latest GPS location for a device
// filepath: c:\Users\Gebruiker\Project_Lab_API\Backend\SS_api\routes\gps.js
router.get('/devices/:id/location/latest', auth, async (req, res) => {
  try {
    // First check if device belongs to user
    const device = await prisma.devices.findFirst({
      where: { 
        id: parseInt(req.params.id),
        user_id: req.user.id 
      }
    });
    
    if (!device) {
      return res.status(403).json({ error: 'Access denied to this device' });
    }
    
    // Then fetch location
    const location = await prisma.gps_locations.findFirst({
      where: { device_id: parseInt(req.params.id) },
      orderBy: { timestamp: 'desc' }
    });
    
    if (!location) return res.status(404).json({ error: 'No location found' });
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;