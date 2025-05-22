
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');



// Create Stripe Checkout Session
router.post('/create-checkout-session', auth, async (req, res) => {
  const { user_id, plan } = req.body;

  // Map plan string to Stripe price ID
  let priceId;
  if (plan === 'premium_1m') priceId = 'price_1RQE1cPctqOdZhsAYWkP3yJZ';    // Replace with your Stripe price ID
  if (plan === 'premium_3m') priceId = 'price_1RQE2NPctqOdZhsAyvYL2kqo';    // Replace with your Stripe price ID
  if (plan === 'premium_12m') priceId = 'price_1RQE2xPctqOdZhsAfgicKFN7';  // Replace with your Stripe price ID

  if (!priceId) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      
      customer_email: req.user.email, // or fetch from DB
      
      success_url: `${process.env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription-cancelled`,
      metadata: {
        user_id: user_id,
        plan: plan
      }
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Get all subscriptions
router.get('/',auth, async (req, res) => {
  try {
    const subs = await prisma.subscriptions.findMany({ include: { users: true } });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get subscription by user
router.get('/user/:userId',auth, async (req, res) => {
  try {
    const sub = await prisma.subscriptions.findFirst({
      where: { user_id: parseInt(req.params.userId) },
      include: { users: true }
    });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create subscription
router.post('/',auth,[
    body('user_id').isInt().withMessage('User ID is required and must be an integer'),
    body('plan').isString().withMessage('Plan is required'),
    body('status').isString().withMessage('Status is required'),
    body('renewal_date').isISO8601().withMessage('Renewal date must be a valid date')
  ],
   async (req, res) => {
  const { user_id, plan, status, renewal_date } = req.body;
  if (!user_id || !plan || !status || !renewal_date) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const sub = await prisma.subscriptions.create({
      data: {
        user_id: parseInt(user_id),
        plan,
        status,
        renewal_date: new Date(renewal_date)
      }
    });
    res.status(201).json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update subscription
router.put('/:id',auth, async (req, res) => {
  const { plan, status, renewal_date } = req.body;
  try {
    const sub = await prisma.subscriptions.update({
      where: { id: parseInt(req.params.id) },
      data: {
        plan,
        status,
        renewal_date: renewal_date ? new Date(renewal_date) : undefined
      }
    });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete subscription
router.delete('/:id',auth, async (req, res) => {
  try {
    await prisma.subscriptions.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;