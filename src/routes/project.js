import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for image uploads
const upload = multer({ dest: 'uploads/' });

// Validate project type
const validateProjectType = (type) => {
  const validTypes = ['Commercial', 'Residential', 'Other'];
  return validTypes.includes(type);
};

// Get all projects for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching projects',
      error: error.message
    });
  }
});

// Get a specific project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching project',
      error: error.message
    });
  }
});

// Create a new project
router.post('/', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const { name, location, area, jobCost, projectType, description } = req.body;

    // Validate required fields
    if (!name || !location || !area || !jobCost || !projectType) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['name', 'location', 'area', 'jobCost', 'projectType']
      });
    }

    // Validate project type
    if (!validateProjectType(projectType)) {
      return res.status(400).json({
        message: 'Invalid project type',
        validTypes: ['Commercial', 'Residential', 'Other']
      });
    }

    // Validate number of images
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({
        message: 'Minimum 2 images required'
      });
    }

    // Upload images to Cloudinary
    const imageUrls = [];
    for (const file of req.files) {
      const imageUrl = await uploadToCloudinary(file);
      imageUrls.push(imageUrl);
      // Clean up uploaded file
      fs.unlinkSync(file.path);
    }

    const project = await prisma.project.create({
      data: {
        userId: req.user.userId,
        name,
        location,
        area: parseFloat(area),
        jobCost: parseFloat(jobCost),
        projectType,
        description,
        images: imageUrls
      }
    });

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error) {
    // Clean up uploaded files in case of error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      message: 'Error creating project',
      error: error.message
    });
  }
});

// Update a project
router.put('/:id', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const { name, location, area, jobCost, projectType, description } = req.body;

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!existingProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate project type if provided
    if (projectType && !validateProjectType(projectType)) {
      return res.status(400).json({
        message: 'Invalid project type',
        validTypes: ['Commercial', 'Residential', 'Other']
      });
    }

    // Handle new images if provided
    let imageUrls = existingProject.images;
    if (req.files && req.files.length > 0) {
      const newImageUrls = [];
      for (const file of req.files) {
        const imageUrl = await uploadToCloudinary(file);
        newImageUrls.push(imageUrl);
        // Clean up uploaded file
        fs.unlinkSync(file.path);
      }
      imageUrls = [...imageUrls, ...newImageUrls];
    }

    // Ensure minimum 2 images requirement is met
    if (imageUrls.length < 2) {
      return res.status(400).json({
        message: 'Minimum 2 images required'
      });
    }

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        name: name || existingProject.name,
        location: location || existingProject.location,
        area: area ? parseFloat(area) : existingProject.area,
        jobCost: jobCost ? parseFloat(jobCost) : existingProject.jobCost,
        projectType: projectType || existingProject.projectType,
        description: description !== undefined ? description : existingProject.description,
        images: imageUrls
      }
    });

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    // Clean up uploaded files in case of error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      message: 'Error updating project',
      error: error.message
    });
  }
});

// Delete a project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.userId
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await prisma.project.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting project',
      error: error.message
    });
  }
});

// Delete a specific image from a project
router.delete('/:id/images/:index', authenticateToken, async (req, res) => {
  try {
    const { id, index } = req.params;
    const indexNum = parseInt(index);

    // Check if project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (indexNum < 0 || indexNum >= project.images.length) {
      return res.status(400).json({ message: 'Invalid image index' });
    }

    // Ensure minimum 2 images requirement is met
    if (project.images.length <= 2) {
      return res.status(400).json({
        message: 'Cannot delete image. Minimum 2 images required'
      });
    }

    const updatedImages = [...project.images];
    updatedImages.splice(indexNum, 1);

    await prisma.project.update({
      where: { id },
      data: { images: updatedImages }
    });

    res.json({
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting image',
      error: error.message
    });
  }
});

export default router;