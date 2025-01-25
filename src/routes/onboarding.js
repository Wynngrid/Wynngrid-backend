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
    fileSize: 5 * 1024 * 1024 // 5MB per file
  }
}).fields([
  { name: 'profilePic', maxCount: 1 },
  { name: 'professionalBannerImages', maxCount: 5 } // Allow up to 5 banner images
]);

// Complete onboarding profile
router.post('/complete-profile', authenticateToken, (req, res) => {
  upload(req, res, async function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(500).json({ message: err.message });
    }

    try {
      console.log('Received body:', req.body);
      console.log('Received files:', req.files);

      if (!req.files || !req.files.profilePic) {
        return res.status(400).json({
          message: 'Profile picture is required'
        });
      }

      if (!req.body.fullName || !req.body.preferredWorkLocations) {
        return res.status(400).json({
          message: 'fullName and preferredWorkLocations are required'
        });
      }

      // Parse arrays with better error handling
      let preferredWorkLocations = [];
      let portfolioUrls = [];
      let typeOfProjects = [];

      try {
        preferredWorkLocations = typeof req.body.preferredWorkLocations === 'string'
          ? JSON.parse(req.body.preferredWorkLocations)
          : req.body.preferredWorkLocations;

        portfolioUrls = typeof req.body.portfolioUrls === 'string'
          ? JSON.parse(req.body.portfolioUrls)
          : req.body.portfolioUrls || [];

        typeOfProjects = typeof req.body.typeOfProjects === 'string'
          ? JSON.parse(req.body.typeOfProjects)
          : req.body.typeOfProjects;
      } catch (parseError) {
        console.error('Error parsing arrays:', parseError);
        return res.status(400).json({ 
          message: 'Invalid array format', 
          error: parseError.message 
        });
      }

      // Validate arrays
      if (!Array.isArray(preferredWorkLocations) || !Array.isArray(portfolioUrls)) {
        return res.status(400).json({ 
          message: 'preferredWorkLocations and portfolioUrls must be arrays' 
        });
      }

      // Upload profile picture to Cloudinary
      const profilePicUrl = await uploadToCloudinary(req.files.profilePic[0]);

      // Upload banner images to Cloudinary if provided
      let professionalBannerImages = [];
      if (req.files.professionalBannerImages) {
        const uploadPromises = req.files.professionalBannerImages.map(file => 
          uploadToCloudinary(file)
        );
        professionalBannerImages = await Promise.all(uploadPromises);
      }

      const profile = await prisma.profile.create({
        data: {
          userId: req.user.userId,
          fullName: req.body.fullName,
          preferredWorkLocations,
          profilePicUrl,
          professionalBannerImages,
          businessName: req.body.businessName,
          contactNumber: req.body.contactNumber,
          city: req.body.city,
          serviceProviderType: req.body.serviceProviderType,
          experienceYears: req.body.experienceYears,
          graduationInfo: req.body.graduationInfo,
          associations: req.body.associations,
          portfolioUrls, // Now properly parsed as array
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
      // console.log('Received body:', req.body);
      // console.log('Received files:', req.files);

      // Get existing profile first
      const existingProfile = await prisma.profile.findUnique({
        where: { userId: req.user.userId },
        include: { projectAverages: true }
      });

      if (!existingProfile) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      // Prepare update data
      let updateData = {};

      // Handle profile picture update
      if (req.files && req.files.profilePic) {
        updateData.profilePicUrl = await uploadToCloudinary(req.files.profilePic[0]);
      }

      // Handle banner images update
      if (req.files && req.files.professionalBannerImages) {
        const newBannerUrls = await Promise.all(
          req.files.professionalBannerImages.map(file => uploadToCloudinary(file))
        );
        updateData.professionalBannerImages = [
          ...existingProfile.professionalBannerImages,
          ...newBannerUrls
        ];
      }

      // Handle other fields only if they are provided
      if (req.body.businessName) updateData.businessName = req.body.businessName;
      if (req.body.contactNumber) updateData.contactNumber = req.body.contactNumber;
      if (req.body.city) updateData.city = req.body.city;
      if (req.body.serviceProviderType) updateData.serviceProviderType = req.body.serviceProviderType;
      if (req.body.experienceYears) updateData.experienceYears = req.body.experienceYears;
      if (req.body.graduationInfo) updateData.graduationInfo = req.body.graduationInfo;
      if (req.body.associations) updateData.associations = req.body.associations;
      if (req.body.websiteUrl) updateData.websiteUrl = req.body.websiteUrl;
      if (req.body.workSetupPreference) updateData.workSetupPreference = req.body.workSetupPreference;
      if (req.body.preferredTimeline) updateData.preferredTimeline = req.body.preferredTimeline;
      if (req.body.aboutUs) updateData.aboutUs = req.body.aboutUs;
      if (req.body.comments) updateData.comments = req.body.comments;

      // Handle arrays
      if (req.body.portfolioUrls) {
        updateData.portfolioUrls = typeof req.body.portfolioUrls === 'string' 
          ? JSON.parse(req.body.portfolioUrls)
          : req.body.portfolioUrls;
      }

      if (req.body.typeOfProjects) {
        const typeOfProjects = typeof req.body.typeOfProjects === 'string'
          ? JSON.parse(req.body.typeOfProjects)
          : req.body.typeOfProjects;

        updateData.projectAverages = {
          deleteMany: {},
          create: typeOfProjects.map(project => ({
            projectType: project.projectType,
            avgArea: project.avgArea,
            avgValue: project.avgValue
          }))
        };
      }

      // Handle new required fields if provided
      if (req.body.fullName) updateData.fullName = req.body.fullName;
      if (req.body.preferredWorkLocations) {
        updateData.preferredWorkLocations = typeof req.body.preferredWorkLocations === 'string'
          ? JSON.parse(req.body.preferredWorkLocations)
          : req.body.preferredWorkLocations;
      }

      const updatedProfile = await prisma.profile.update({
        where: { userId: req.user.userId },
        data: updateData,
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

// New route to delete banner image by index
router.delete('/delete-banner-image/:index', authenticateToken, async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    
    // Get existing profile
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Validate index
    if (index < 0 || index >= profile.professionalBannerImages.length) {
      return res.status(400).json({ message: 'Invalid image index' });
    }

    // Remove image at specified index
    const updatedBannerImages = profile.professionalBannerImages.filter((_, i) => i !== index);

    // Update profile
    const updatedProfile = await prisma.profile.update({
      where: { userId: req.user.userId },
      data: {
        professionalBannerImages: updatedBannerImages
      }
    });

    res.json({
      message: 'Banner image deleted successfully',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Delete banner image error:', error);
    res.status(500).json({ 
      message: 'Error deleting banner image', 
      error: error.message 
    });
  }
});

export default router;
