import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all pro users with their onboarding details and projects
router.get('/', async (req, res) => {
  try {
    // Fetch all pro users with their profiles and projects
    const proUsers = await prisma.user.findMany({
      where: { userType: 'pro' },
      include: {
        profile: true, // Include onboarding details
        projects: true, // Include all projects
      },
    });

    // Return the pro users data
    res.json(proUsers);
  } catch (error) {
    console.error('Error fetching pro users:', error);
    res.status(500).json({
      message: 'Error fetching pro user details',
      error: error.message,
    });
  }
});

export default router;
