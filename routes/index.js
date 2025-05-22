const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const router = express.Router();
router.use(bodyParser.json());

// Initialize Firebase
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Email Transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Endpoint for ESP32 to trigger alert
router.post('/alert', async (req, res) => {
  const { message = "Emergency button pressed!" } = req.body;

  try {
    // 1. Send push notification
    await admin.messaging().send({
      notification: {
        title: '🚨 Emergency Alert',
        body: message,
      },
      topic: process.env.FCM_TOPIC,
    });

    console.log("Push sent");

    // 2. Send email alert
    await transporter.sendMail({
      from: `"ElderCare System" <${process.env.EMAIL_USER}>`,
      to: "caregiver@example.com",  // replace or use env
      subject: "🚨 Emergency Alert",
      text: message,
    });

    console.log("Email sent");

    res.status(200).send({ success: true });
  } catch (error) {
    console.error("Error sending alert:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});


module.exports = router;
