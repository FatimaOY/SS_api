const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const deviceRoutes = require('./routes/devices');
const alertRoutes = require('./routes/alerts');
const userRoutes = require('./routes/users');
const caregiverRoutes = require('./routes/caregivers');
const patientRoutes = require('./routes/patients');
const eventRoutes = require('./routes/events');
const medicalRoutes = require('./routes/medical');
const subscriptionRoutes = require('./routes/subscriptions');
const gpsRoutes = require('./routes/gps');
const voiceRoutes = require('./routes/voice');
const profileRoutes = require('./routes/profile');
const authRoutes = require('./routes/auth');
const path = require('path');
const cookieParser = require('cookie-parser');

// Use routes
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api', gpsRoutes);
app.use('/api', voiceRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/auth', authRoutes);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});




module.exports = app;
