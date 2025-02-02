import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import projectRoutes from './routes/project.js';
import contactRoutes from './routes/contact.js';
import helmet from 'helmet';
import compression from 'compression';
import notifyUserRouter from './routes/notifyuser.js';
import getAllProRoutes from './routes/getAllPro.js';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifyuser', notifyUserRouter);
app.use('/api/pro-users', getAllProRoutes);


// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});