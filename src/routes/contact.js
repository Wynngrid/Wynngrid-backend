// import express from 'express';
// import { PrismaClient } from '@prisma/client';
// import { sendEmail } from '../utils/email.js';

// const router = express.Router();
// const prisma = new PrismaClient();

// // Validate contact purpose
// const validatePurpose = (purpose) => {
//   const validPurposes = ['Query', 'Feedback', 'Support','Advertise', 'Other'];
//   return validPurposes.includes(purpose);
// };

// // Submit contact form
// router.post('/', async (req, res) => {
//   try {
//     const {
//       purpose,
//       firstName,
//       lastName,
//       phoneNumber,
//       email,
//       message,
//       requireCallback
//     } = req.body;

//     // Validate required fields
//     if (!purpose || !firstName || !lastName || !phoneNumber || !email || !message) {
//       return res.status(400).json({
//         message: 'Missing required fields',
//         required: ['purpose', 'firstName', 'lastName', 'phoneNumber', 'email', 'message']
//       });
//     }

//     // Validate purpose
//     if (!validatePurpose(purpose)) {
//       return res.status(400).json({
//         message: 'Invalid purpose',
//         validPurposes: ['Query', 'Feedback', 'Support', 'Business']
//       });
//     }

//     // Create contact entry
//     const contact = await prisma.contact.create({
//       data: {
//         purpose,
//         firstName,
//         lastName,
//         phoneNumber,
//         email,
//         message,
//         requireCallback: requireCallback || false
//       }
//     });

//     // Send email notification to admin
//     const adminEmailText = `
// New Contact Form Submission

// Purpose: ${purpose}
// Name: ${firstName} ${lastName}
// Email: ${email}
// Phone: ${phoneNumber}
// Requires Callback: ${requireCallback ? 'Yes' : 'No'}

// Message:
// ${message}
//     `;

//     await sendEmail(
//       process.env.ADMIN_EMAIL,
//       `New Contact Form Submission - ${purpose}`,
//       adminEmailText
//     );

//     // Send confirmation email to user
//     const userEmailText = `
// Dear ${firstName} ${lastName},

// Thank you for contacting us. Here's a summary of your submission:

// Purpose: ${purpose}
// Phone Number: ${phoneNumber}
// Message: ${message}
// Callback Requested: ${requireCallback ? 'Yes' : 'No'}

// We have received your message and will get back to you soon.
// ${requireCallback ? 'Since you requested a callback, our team will contact you at the provided phone number.' : ''}

// Best regards,
// Your Platform Team
//     `;

//     await sendEmail(
//       email,
//       'Thank you for contacting us',
//       userEmailText
//     );

//     res.status(201).json({
//       message: 'Contact form submitted successfully',
//       contact
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: 'Error submitting contact form',
//       error: error.message
//     });
//   }
// });

// export default router;/
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
New Contact Form Submission

Purpose: ${purpose}
Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phoneNumber}
Requires Callback: ${requireCallback ? 'Yes' : 'No'}

Message:
${message}
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
Dear ${firstName} ${lastName},

Thank you for contacting us. Here's a summary of your submission:

Purpose: ${purpose}
Phone Number: ${phoneNumber}
Message: ${message}
Callback Requested: ${requireCallback ? 'Yes' : 'No'}

We have received your message and will get back to you soon.
${requireCallback ? 'Since you requested a callback, our team will contact you at the provided phone number.' : ''}

Best regards,
Your Platform Team
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