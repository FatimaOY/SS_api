const { Router } = require('express');
require('dotenv').config();


const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const prisma = new PrismaClient();
const webhookRoutes = require('./routes/webhook');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


const webhookRouter = Router();
webhookRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // const sig = req.headers['stripe-signature'];
    // let event;
    // try {
      // event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // } catch (err) {
      // return res.status(400).send(`Webhook Error: ${err.message}`);
    // }

    let event;
    try {
      // If body is a Buffer (Stripe CLI), parse it. If it's already an object (Postman), use as is.
      if (Buffer.isBuffer(req.body)) {
        event = JSON.parse(req.body.toString());
      } else if (typeof req.body === 'object') {
        event = req.body;
      } else {
        throw new Error('Invalid webhook body');
      }
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const user_id = parseInt(session.metadata.user_id);
      await prisma.subscriptions.updateMany({
        where: { user_id },
        data: { status: 'active' }
      });
    }
    res.json({ received: true });
  }
);

app.use('/api', webhookRouter);







// Import routes
const deviceRoutes = require('./routes/devices');
const alertRoutes = require('./routes/alerts');
const userRoutes = require('./routes/users');
const caregiverRoutes = require('./routes/caregivers');
const patientRoutes = require('./routes/patients');
// const eventRoutes = require('./routes/events');
const medicalRoutes = require('./routes/medical');
const gpsRoutes = require('./routes/gps');
const voiceRoutes = require('./routes/voice');
const profileRoutes = require('./routes/profile');
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscriptions');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Use routes
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/patients', patientRoutes);
// app.use('/api/events', eventRoutes);
app.use('/api/medical', medicalRoutes);

app.use('/api', gpsRoutes);
app.use('/api', voiceRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/auth', authRoutes);

// app.use('/api', webhookRoutes);

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
