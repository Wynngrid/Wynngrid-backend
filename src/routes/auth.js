
// import express from 'express';
// import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { sendEmail } from '../utils/email.js';

// const router = express.Router();
// const prisma = new PrismaClient();

// // Signup
// router.post('/signup', async (req, res) => {
//   try {
//     const { firstName, lastName, email, password } = req.body;

//     // Check if user already exists
//     const existingUser = await prisma.user.findUnique({ where: { email } });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Email already registered' });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//     // Create user in database
//     const user = await prisma.user.create({
//       data: {
//         firstName,
//         lastName,
//         email,
//         password: hashedPassword,
//         otp,
//         otpExpiry,
//       },
//     });

//     // Send email with OTP
//     await sendEmail(email, 'Verify your email', `Your OTP is: ${otp}`);

//     res.status(201).json({ message: 'User created. Please verify your email.' });
//   } catch (error) {
//     console.error('Error during signup:', error);
//     res.status(500).json({ message: 'Error creating user', error: error.message });
//   }
// });

// // Verify OTP
// router.post('/verify-otp', async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (user.otp !== otp || new Date() > user.otpExpiry) {
//       return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }

//     await prisma.user.update({
//       where: { email },
//       data: { isVerified: true, otp: null, otpExpiry: null },
//     });

//     res.json({ message: 'Email verified successfully' });
//   } catch (error) {
//     res.status(500).json({ message: 'Error verifying OTP', error: error.message });
//   }
// });

// // Login
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (!user.isVerified) {
//       return res.status(400).json({ message: 'Please verify your email first' });
//     }

//     const validPassword = await bcrypt.compare(password, user.password);
//     if (!validPassword) {
//       return res.status(400).json({ message: 'Invalid password' });
//     }

//     const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
//     res.json({ token });
//   } catch (error) {
//     res.status(500).json({ message: 'Error logging in', error: error.message });
//   }
// });

// // Forgot Password
// router.post('/forgot-password', async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

//     await prisma.user.update({
//       where: { email },
//       data: { otp, otpExpiry }
//     });

//     await sendEmail(email, 'Reset Password', `Your password reset OTP is: ${otp}`);

//     res.json({ message: 'Password reset OTP sent to email' });
//   } catch (error) {
//     res.status(500).json({ message: 'Error processing request', error: error.message });
//   }
// });

// // Reset Password
// router.post('/reset-password', async (req, res) => {
//   try {
//     const { email, otp, newPassword } = req.body;

//     const user = await prisma.user.findUnique({ where: { email } });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (user.otp !== otp || new Date() > user.otpExpiry) {
//       return res.status(400).json({ message: 'Invalid or expired OTP' });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     await prisma.user.update({
//       where: { email },
//       data: { 
//         password: hashedPassword,
//         otp: null,
//         otpExpiry: null
//       }
//     });

//     res.json({ message: 'Password reset successfully' });
//   } catch (error) {
//     res.status(500).json({ message: 'Error resetting password', error: error.message });
//   }
// });
// export default router;
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/email.js';

const router = express.Router();
const prisma = new PrismaClient();

// Function to validate password
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
  return passwordRegex.test(password);
};

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one special character, and one number.',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user in database
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        otp,
        otpExpiry,
      },
    });

    // Send email with OTP
    await sendEmail(email, 'Verify your email', `Your OTP is: ${otp}`);

    res.status(201).json({ message: 'User created. Please verify your email.' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find the user in the database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the OTP is valid and not expired
    if (user.otp !== otp || new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Mark the user as verified and clear OTP details
    await prisma.user.update({
      where: { email },
      data: { isVerified: true, otp: null, otpExpiry: null },
    });

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '240h' });

    // Respond with a success message and the token
    res.json({ message: 'Email verified successfully', token });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email first' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '240h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiry },
    });

    await sendEmail(email, 'Reset Password', `Your password reset OTP is: ${otp}`);

    res.json({ message: 'Password reset OTP sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing request', error: error.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long and include at least one uppercase letter, one lowercase letter, one special character, and one number.',
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp !== otp || new Date() > user.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpiry: null,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});
// Delete Account
router.delete('/delete-account', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user in the database
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate password (if password validation is required)
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Delete the user
    await prisma.user.delete({ where: { email } });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error during account deletion:', error);
    res.status(500).json({ message: 'Error deleting account', error: error.message });
  }
});
// Logout
router.post('/logout', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token is required for logout' });
    }

    // Ideally, store the token in a blacklist with an expiration
    // For simplicity, logging out here assumes the client will clear the token
    // Example: Add token to blacklist in the database or cache
    // await prisma.blacklist.create({ data: { token } });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
});

export default router;
