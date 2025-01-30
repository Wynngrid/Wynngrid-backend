import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/email.js';
import { OAuth2Client } from 'google-auth-library';

const router = express.Router();
const prisma = new PrismaClient();

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
});

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
    
    // If user exists but is not verified, update their details and send new OTP
    if (existingUser && !existingUser.isVerified) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { email },
        data: {
          firstName,
          lastName,
          password: hashedPassword,
          otp,
          otpExpiry,
        },
      });

      // Send email with new OTP
      //await sendEmail(email, 'Verify your email', `Your OTP is: ${otp}. This OTP is valid for 10 minutes. Please use it to verify your email address.`);
      // Send email with OTP
await sendEmail(email, 'Verify your email', `
  <h2 style="color: #333;">Welcome to Wynngrid!</h2>
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
    
  
    
    <h2 style="color: #001f3f; text-align: center;">Verification Code</h2>
    <p style="font-size: 16px; color: #333; text-align: center;">Please use the verification code below to sign in.This OTP is valid for 10 minutes.</p>
    
    <div style="text-align: center; font-size: 25px; font-weight: bold; margin: 20px 0;">
      ${otp}
    </div>

    <p style="color: #555; text-align: center;">If you didn’t request this, you can ignore this email.</p>

    <p style="text-align: center;">Thanks,<br><strong>Team Wynngrid</strong></p>
  </div>
`);

      return res.status(200).json({ 
        message: 'New verification OTP has been sent to your email.' 
      });
    }

    // If user exists and is verified, return error
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'Email already registered and verified' });
    }

    // If user doesn't exist, continue with normal signup process
    const hashedPassword = await bcrypt.hash(password, 10);
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
    //await sendEmail(email, 'Verify your email', `Your OTP is: ${otp}. This OTP is valid for 10 minutes. Please use it to verify your email address.`);
    await sendEmail(email, 'Verify your email', `
      <h2 style="color: #333;">Welcome to Wynngrid!</h2>
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        
      
        
        <h2 style="color: #001f3f; text-align: center;">Verification Code</h2>
        <p style="font-size: 16px; color: #333; text-align: center;">Please use the verification code below to sign in.This OTP is valid for 10 minutes.</p>
        
        <div style="text-align: center; font-size: 25px; font-weight: bold; margin: 20px 0;">
          ${otp}
        </div>
    
        <p style="color: #555; text-align: center;">If you didn’t request this, you can ignore this email.</p>
    
        <p style="text-align: center;">Thanks,<br><strong>Team Wynngrid</strong></p>
      </div>
    `);
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

    //await sendEmail(email, 'Reset Password', `Your password reset OTP is: ${otp}. This OTP is valid for 10 minutes. Please use it to reset your password.`);
    await sendEmail(email, 'Reset Password', `
      <h2 style="color: #333;">Welcome to Wynngrid!</h2>
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
        
      
        
        <h2 style="color: #001f3f; text-align: center;">Verification Code</h2>
        <p style="font-size: 16px; color: #333; text-align: center;">Please use the verification code below to sign in.This OTP is valid for 10 minutes.</p>
        
        <div style="text-align: center; font-size: 22px; font-weight: bold; margin: 20px 0;">
          ${otp}
        </div>
    
        <p style="color: #555; text-align: center;">If you didn’t request this, you can ignore this email.</p>
    
        <p style="text-align: center;">Thanks,<br><strong>Team Wynngrid</strong></p>
      </div>
    `);
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

    // Find the user in the database with all related data
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: {
        profile: {
          include: {
            projectAverages: true
          }
        },
        projects: true // Include user's projects
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Delete in the correct order to handle all foreign key constraints
    await prisma.$transaction(async (prisma) => {
      // 1. Delete all project averages if profile exists
      if (user.profile) {
        await prisma.projectAverage.deleteMany({
          where: {
            profileId: user.profile.id
          }
        });
      }

      // 2. Delete all projects associated with the user
      await prisma.project.deleteMany({
        where: {
          userId: user.id
        }
      });

      // 3. Delete the profile if it exists
      if (user.profile) {
        await prisma.profile.delete({
          where: { userId: user.id }
        });
      }

      // 4. Finally delete the user
      await prisma.user.delete({
        where: { id: user.id }
      });
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error during account deletion:', error);
    res.status(500).json({ 
      message: 'Error deleting account', 
      error: error.message 
    });
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

// Google Sign-up
// router.post('/google-signup', async (req, res) => {
//   try {
//     const { token } = req.body;

//     // Verify Google token
//     const ticket = await client.verifyIdToken({
//       idToken: token,
//       audience: process.env.GOOGLE_CLIENT_ID
//     });

//     const payload = ticket.getPayload();
//     console.log('Google payload:', payload); // Debug log

//     if (!payload || !payload.email) {
//       return res.status(400).json({ 
//         message: 'Invalid Google token or missing email' 
//       });
//     }

//     const { email, name, given_name, family_name } = payload;

//     // Check if user exists
//     let user = await prisma.user.findUnique({ where: { email } });

//     if (user) {
//       // If user exists, generate token and return
//       const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
//       return res.json({ 
//         message: 'User already exists',
//         token,
//         user: {
//           id: user.id,
//           email: user.email,
//           firstName: user.firstName,
//           lastName: user.lastName
//         }
//       });
//     }

//     // Handle name fields with fallbacks
//     let firstName = '';
//     let lastName = '';

//     if (given_name && family_name) {
//       // Use given_name and family_name if available
//       firstName = given_name;
//       lastName = family_name;
//     } else if (name) {
//       // Fall back to splitting full name if available
//       const nameParts = name.split(' ');
//       firstName = nameParts[0] || '';
//       lastName = nameParts.slice(1).join(' ') || '';
//     } else {
//       // Last resort: use email prefix as firstName
//       firstName = email.split('@')[0];
//       lastName = '';
//     }

//     // Create new user
//     user = await prisma.user.create({
//       data: {
//         email,
//         firstName,
//         lastName,
//         password: '', // Empty password for Google users
//         isVerified: true // Google accounts are pre-verified
//       }
//     });

//     // Generate JWT token
//     const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

//     res.status(201).json({
//       message: 'User created successfully',
//       token: jwtToken,
//       user: {
//         id: user.id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName
//       }
//     });
//   } catch (error) {
//     console.error('Google signup error:', error);
//     console.error('Error details:', error.stack); // Add stack trace for debugging
//     res.status(500).json({ 
//       message: 'Error during Google signup', 
//       error: error.message 
//     });
//   }
// });
// Google Sign-up/Login
router.post('/google-auth', async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('Google payload:', payload); // Debug log

    if (!payload || !payload.email) {
      return res.status(400).json({
        message: 'Invalid Google token or missing email',
      });
    }

    const { email, name, given_name, family_name } = payload;

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // If user exists, generate token and return
      const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

      return res.json({
        message: 'User logged in successfully',
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        isNewUser: false, // Indicate user already exists
      });
    }

    // Handle name fields with fallbacks
    let firstName = '';
    let lastName = '';

    if (given_name && family_name) {
      firstName = given_name;
      lastName = family_name;
    } else if (name) {
      const nameParts = name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else {
      firstName = email.split('@')[0];
      lastName = '';
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: '', // Empty password for Google users
        isVerified: true, // Google accounts are pre-verified
      },
    });

    // Generate JWT token
    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User signed up successfully',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      isNewUser: true, // Indicate user is new
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      message: 'Error during Google authentication',
      error: error.message,
    });
  }
});


// Google Sign-in
router.post('/google-signin', async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return res.status(400).json({ 
        message: 'Invalid Google token or missing email' 
      });
    }

    const { email } = payload;

    // Find user in database
    const user = await prisma.user.findUnique({ 
      where: { email }
    });

    // If user doesn't exist, return error
    if (!user) {
      return res.status(404).json({ 
        message: 'No account found with this Google email. Please sign up first.' 
      });
    }

    // Generate JWT token
    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '240h' });

    // Return success response with token and user data
    res.json({
      message: 'Successfully signed in with Google',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('Google signin error:', error);
    res.status(500).json({ 
      message: 'Error during Google signin', 
      error: error.message 
    });
  }
});

export default router;
