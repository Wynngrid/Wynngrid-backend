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

// Helper function to validate fields based on service provider type
// const validateFields = (serviceProviderType, body) => {
//   const errors = [];

//   if (!body.profilePicUrl) errors.push('Profile picture is required.');

//   if (serviceProviderType === 'Architect' || serviceProviderType === 'Both') {
//     if (!body.experienceYears) errors.push('Experience years is required for Architect or Both.');
//     if (!body.graduationInfo) errors.push('Graduation info is required for Architect or Both.');
//     if (!body.avgProjectArea) errors.push('Average project area is required for Architect or Both.');
//     if (!body.avgProjectValue) errors.push('Average project value is required for Architect or Both.');
//     if (!body.projectTypes) errors.push('Project types are required for Architect or Both.');
//   }

//   if (serviceProviderType === 'Interior Designer' || serviceProviderType === 'Both') {
//     if (!body.experienceYears) errors.push('Experience years is required for Interior Designer or Both.');
//     if (!body.graduationInfo) errors.push('Graduation info is required for Interior Designer or Both.');
//     if (!body.projectTypes) errors.push('Project types are required for Interior Designer or Both.');
//     if (!body.preferredTimeline) errors.push('Preferred timeline is required for Interior Designer.');
//     if (!body.avgProjectArea) errors.push('Average project area is required for Interior Designer.');
//     if (!body.avgProjectValue) errors.push('Average project value is required for Interior Designer.');
//   }

//   return errors;
// };

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

      // Parse arrays properly
      let projectTypes = [];
      let portfolioUrls = [];

      try {
        // Handle projectTypes
        if (req.body.projectTypes) {
          projectTypes = Array.isArray(req.body.projectTypes) 
            ? req.body.projectTypes 
            : JSON.parse(req.body.projectTypes);
        }

        // Handle portfolioUrls
        if (req.body.portfolioUrls) {
          portfolioUrls = Array.isArray(req.body.portfolioUrls) 
            ? req.body.portfolioUrls 
            : JSON.parse(req.body.portfolioUrls);
        }
      } catch (parseError) {
        console.error('Parsing error:', parseError);
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
          avgProjectArea: req.body.avgProjectArea,
          avgProjectValue: req.body.avgProjectValue,
          projectTypes,
          portfolioUrls,
          websiteUrl: req.body.websiteUrl,
          workSetupPreference: req.body.workSetupPreference,
          preferredTimeline: req.body.preferredTimeline,
          aboutUs: req.body.aboutUs,
          comments: req.body.comments
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
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching profile', 
      error: error.message 
    });
  }
});

// Update profile
router.put('/update-profile', authenticateToken, upload, async (req, res) => {
  try {
    let profilePicUrl = undefined;
    
    if (req.file) {
      // Upload new image to Cloudinary if provided
      profilePicUrl = await uploadToCloudinary(req.file);
    }

    const {
      businessName,
      contactNumber,
      city,
      serviceProviderType,
      experienceYears,
      graduationInfo,
      associations,
      avgProjectArea,
      avgProjectValue,
      projectTypes,
      portfolioUrls,
      websiteUrl,
      workSetupPreference,
      preferredTimeline,
      aboutUs,
      comments
    } = req.body;

    // Validate serviceProviderType
    const validTypes = ['Architect', 'Interior Designer', 'Architect + Interior Designer'];
    if (serviceProviderType && !validTypes.includes(serviceProviderType)) {
      return res.status(400).json({
        message: 'Invalid serviceProviderType. Must be Architect, Interior Designer, or Both'
      });
    }

    // Process portfolio URLs
    const processedPortfolioUrls = Array.isArray(portfolioUrls) 
      ? portfolioUrls 
      : portfolioUrls ? [portfolioUrls] : [];

    // Validate Google Drive URLs
    const isValidGoogleDriveUrl = (url) => {
      return url && url.includes('drive.google.com');
    };

    if (processedPortfolioUrls.some(url => !isValidGoogleDriveUrl(url))) {
      return res.status(400).json({
        message: 'Invalid Google Drive URL provided'
      });
    }

    const updatedProfile = await prisma.profile.update({
      where: { userId: req.user.userId },
      data: {
        ...(profilePicUrl && { profilePicUrl }), // Only update if new image is uploaded
        businessName,
        contactNumber,
        city,
        serviceProviderType,
        experienceYears,
        graduationInfo,
        associations,
        avgProjectArea,
        avgProjectValue,
        projectTypes: Array.isArray(projectTypes) ? projectTypes : [projectTypes],
        portfolioUrls: processedPortfolioUrls,
        websiteUrl,
        workSetupPreference,
        preferredTimeline,
        aboutUs,
        comments
      }
    });
    // Send confirmation email
    // const user = await prisma.user.findUnique({
    //   where: { id: req.user.userId }
    // });

    // await sendEmail(
    //   user.email,
    //   'Onboarding Complete',
    //   'Account is updated'
    // );

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
    

   
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating profile', 
      error: error.message 
    });
  }
});

// Delete profile
router.delete('/delete-profile', authenticateToken, async (req, res) => {
  try {
    await prisma.profile.delete({
      where: { userId: req.user.userId }
    });

    res.json({ message: 'Profile deleted successfully' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    await sendEmail(
      user.email,
      'Profile deleted',
      'Profile deleted successfully'
    );
  } catch (error) {
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
        profile: true
      }
    });

    if (!userWithProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userWithProfile);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching user details', 
      error: error.message 
    });
  }
});

export default router;
