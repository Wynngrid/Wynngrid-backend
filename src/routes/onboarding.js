import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { sendEmail } from '../utils/email.js';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// Update multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('profilePic');  // Specify the field name here


// Complete onboarding profile
router.post('/complete-profile', authenticateToken, (req, res) => {
  upload(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(500).json({ message: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Profile picture is required'
        });
      }

      // Upload to Cloudinary
      const profilePicUrl = await uploadToCloudinary(req.file);

      let typeOfProjects = [];

      try {
        // Parse typeOfProjects
        if (req.body.typeOfProjects) {
          typeOfProjects = Array.isArray(req.body.typeOfProjects) 
            ? req.body.typeOfProjects 
            : JSON.parse(req.body.typeOfProjects);
        }

        // Validate that typeOfProjects is not empty
        if (!typeOfProjects.length) {
          return res.status(400).json({
            message: 'At least one project type with average area and value is required'
          });
        }
      } catch (parseError) {
        console.error('Parsing error:', parseError);
        return res.status(400).json({ message: 'Invalid data format' });
      }

      const profile = await prisma.profile.create({
        data: {
          userId: req.user.userId,
          profilePicUrl,
          businessName: req.body.businessName,
          contactNumber: req.body.contactNumber,
          city: req.body.city,
          serviceProviderType: req.body.serviceProviderType,
          experienceYears: req.body.experienceYears,
          graduationInfo: req.body.graduationInfo,
          associations: req.body.associations,
          portfolioUrls: Array.isArray(req.body.portfolioUrls) 
            ? req.body.portfolioUrls 
            : JSON.parse(req.body.portfolioUrls),
          websiteUrl: req.body.websiteUrl,
          workSetupPreference: req.body.workSetupPreference,
          preferredTimeline: req.body.preferredTimeline,
          aboutUs: req.body.aboutUs,
          comments: req.body.comments,
          projectAverages: {
            create: typeOfProjects.map(project => ({
              projectType: project.projectType,
              avgArea: project.avgArea,
              avgValue: project.avgValue
            }))
          }
        },
        include: {
          projectAverages: true
        }
      });
    // Send confirmation email
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    await sendEmail(
      user.email,
      'Onboarding Complete',
      'Thank you for completing your onboarding process. We appreciate you believing in us!'
    );
      res.status(201).json({
        message: 'Profile completed successfully',
        profile
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ 
        message: 'Error completing profile', 
        error: error.message 
      });
    }
  });
});

// Get profile by user ID
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await prisma.profile.findFirst({
      where: { userId: req.user.userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        projectAverages: {
          select: {
            id: true,
            projectType: true,
            avgArea: true,
            avgValue: true
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ 
      message: 'Error fetching profile', 
      error: error.message 
    });
  }
});

// Update profile
router.put('/update-profile', authenticateToken, (req, res) => {
  upload(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(500).json({ message: err.message });
    }

    try {
      // Debug logging
      console.log('Received body:', req.body);
      
      if (!req.body.data) {
        return res.status(400).json({ 
          message: 'Missing data field in request body',
          receivedBody: req.body
        });
      }

      // Parse the data field
      let parsedData;
      try {
        parsedData = typeof req.body.data === 'string' 
          ? JSON.parse(req.body.data)
          : req.body.data;

        console.log('Parsed data:', parsedData);
      } catch (error) {
        console.error('Error parsing data:', error);
        return res.status(400).json({ 
          message: 'Invalid JSON data format',
          details: error.message,
          receivedData: req.body.data 
        });
      }

      // Handle profile picture update
      let profilePicUrl;
      if (req.file) {
        profilePicUrl = await uploadToCloudinary(req.file);
      }

      // Validate typeOfProjects
      if (!parsedData.typeOfProjects || !Array.isArray(parsedData.typeOfProjects) || parsedData.typeOfProjects.length === 0) {
        return res.status(400).json({
          message: 'At least one project type with average area and value is required'
        });
      }

      // Validate each project type has required fields
      for (const project of parsedData.typeOfProjects) {
        if (!project.projectType || !project.avgArea || !project.avgValue) {
          return res.status(400).json({
            message: 'Each project type must include projectType, avgArea, and avgValue'
          });
        }
      }

      const updatedProfile = await prisma.profile.update({
        where: { userId: req.user.userId },
        data: {
          ...(profilePicUrl && { profilePicUrl }),
          businessName: parsedData.businessName,
          contactNumber: parsedData.contactNumber,
          city: parsedData.city,
          serviceProviderType: parsedData.serviceProviderType,
          experienceYears: parsedData.experienceYears,
          graduationInfo: parsedData.graduationInfo,
          associations: parsedData.associations,
          portfolioUrls: parsedData.portfolioUrls,
          websiteUrl: parsedData.websiteUrl,
          workSetupPreference: parsedData.workSetupPreference,
          preferredTimeline: parsedData.preferredTimeline,
          aboutUs: parsedData.aboutUs,
          comments: parsedData.comments,
          projectAverages: {
            deleteMany: {},
            create: parsedData.typeOfProjects.map(project => ({
              projectType: project.projectType,
              avgArea: project.avgArea,
              avgValue: project.avgValue
            }))
          }
        },
        include: {
          projectAverages: true
        }
      });

      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({ 
        message: 'Error updating profile', 
        error: error.message 
      });
    }
  });
});

// Delete profile
router.delete('/delete-profile', authenticateToken, async (req, res) => {
  try {
    // First delete all related project averages
    await prisma.projectAverage.deleteMany({
      where: {
        profile: {
          userId: req.user.userId
        }
      }
    });

    // Then delete the profile
    await prisma.profile.delete({
      where: { userId: req.user.userId }
    });

    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    // Send email notification
    await sendEmail(
      user.email,
      'Profile deleted',
      'Profile deleted successfully'
    );

    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      message: 'Error deleting profile', 
      error: error.message 
    });
  }
});

// Get user details with profile
router.get('/user-details', authenticateToken, async (req, res) => {
  try {
    const userWithProfile = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profile: {
          include: {
            projectAverages: {
              select: {
                id: true,
                projectType: true,
                avgArea: true,
                avgValue: true
              }
            }
          }
        }
      }
    });

    if (!userWithProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userWithProfile);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ 
      message: 'Error fetching user details', 
      error: error.message 
    });
  }
});

export default router;
