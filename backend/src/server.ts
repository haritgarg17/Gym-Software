import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root first, or locally
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

import app from './app';
import prisma from './config/db';

import { initReminderCron } from './services/cron.service';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('Successfully connected to the database via Prisma.');

    // Initialize payment reminders scheduler and templates
    await initReminderCron();

    const server = app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Handle graceful shutdowns
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received. Shutting down gracefully.');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database connections closed. Process terminated.');
      });
    });

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

startServer();
