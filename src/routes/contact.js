import express from 'express';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../utils/email.js';

const router = express.Router();
const prisma = new PrismaClient();

// Validate contact purpose
const validatePurpose = (purpose) => {
  const validPurposes = ['Query', 'Feedback', 'Support', 'Business'];
  return validPurposes.includes(purpose);
};

// Submit contact form
router.post('/', async (req, res) => {
  try {
    const {
      purpose,
      firstName,
      lastName,
      phoneNumber,
      email,
      message,
      requireCallback
    } = req.body;

    // Validate required fields
    if (!purpose || !firstName || !lastName || !phoneNumber || !email || !message) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['purpose', 'firstName', 'lastName', 'phoneNumber', 'email', 'message']
      });
    }

    // Validate purpose
    if (!validatePurpose(purpose)) {
      return res.status(400).json({
        message: 'Invalid purpose',
        validPurposes: ['Query', 'Feedback', 'Support', 'Business']
      });
    }

    // Create contact entry
    const contact = await prisma.contact.create({
      data: {
        purpose,
        firstName,
        lastName,
        phoneNumber,
        email,
        message,
        requireCallback: requireCallback || false
      }
    });

    // Check if admin email is configured
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL not configured. Skipping admin notification.');
    } else {
      try {
        // Send email notification to admin
        const adminEmailText = `
          <div style="font-size: 20px; text-align: left;">
            <strong>New Contact Form Submission</strong><br><br>
            <strong>Purpose:</strong> ${purpose}<br>
            <strong>Name:</strong> ${firstName} ${lastName}<br>
            <strong>Email:</strong> ${email}<br>
            <strong>Phone:</strong> ${phoneNumber}<br>
            <strong>Requires Callback:</strong> ${requireCallback ? 'Yes' : 'No'}<br><br>
            <strong>Message:</strong><br>${message}
          </div>
        `;

        await sendEmail(
          adminEmail,
          `New Contact Form Submission - ${purpose}`,
          adminEmailText
        );
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError);
        // Continue execution - don't fail the request if admin email fails
      }
    }

    try {
      // Send confirmation email to user
      const userEmailText = `
        <div style="font-size: 20px; text-align: left;">
          Dear ${firstName} ${lastName},<br><br>
          Thank you for contacting us. Here's a summary of your submission:<br><br>
          <strong>Purpose:</strong> ${purpose}<br>
          <strong>Phone Number:</strong> ${phoneNumber}<br>
          <strong>Message:</strong> ${message}<br>
          <strong>Callback Requested:</strong> ${requireCallback ? 'Yes' : 'No'}<br><br>
          We have received your message and will get back to you soon.<br>
          ${requireCallback ? 'Since you requested a callback, our team will contact you at the provided phone number.' : ''}<br><br>
          Best regards,<br>
          Team Wynngrid
        </div>
      `;

      await sendEmail(
        email,
        'Thank you for contacting us',
        userEmailText
      );
    } catch (emailError) {
      console.error('Failed to send user confirmation:', emailError);
      // Continue execution - don't fail the request if user email fails
    }

    res.status(201).json({
      message: 'Contact form submitted successfully',
      contact
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      message: 'Error submitting contact form',
      error: error.message
    });
  }
});

export default router;