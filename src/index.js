import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import onboardingRoutes from './routes/onboarding.js';
import projectRoutes from './routes/project.js';
import contactRoutes from './routes/contact.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/contact', contactRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});