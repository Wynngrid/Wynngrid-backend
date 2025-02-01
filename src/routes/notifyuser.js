import express from 'express';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../utils/email.js';  // Add .js extension

const router = express.Router();
const prisma = new PrismaClient();

router.post('/notify-me', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if the email already exists in the database
    const existingSubscriber = await prisma.notificationSubscriber.findUnique({
      where: { email }
    });

    if (existingSubscriber) {
      return res.status(409).json({
        success: false,
        message: 'Email is already subscribed'
      });
    }

    // Store the email in database
    const notification = await prisma.notificationSubscriber.create({
      data: {
        email,
        status: 'PENDING'
      }
    });

    // Ensure the email is defined before sending
    if (!email || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'No recipient defined for the email'
      });
    }

    // Send confirmation email
    await sendEmail(email, 'Notification Subscription Confirmed', `Thank you for your interest! We'll notify you as soon as our service goes live.`);

    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed for notification'
    });

  } catch (error) {
    console.error('Notification subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
