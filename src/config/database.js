import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});

// Test the connection
prisma.$connect()
  .then(() => console.log('Successfully connected to database'))
  .catch((error) => console.error('Database connection error:', error));

export default prisma; 