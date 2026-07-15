import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.routes';
import memberRouter from './routes/member.routes';
import trainerRouter from './routes/trainer.routes';
import classRouter from './routes/class.routes';
import paymentRouter from './routes/payment.routes';
import inventoryRouter from './routes/inventory.routes';
import branchRouter from './routes/branch.routes';
import reportRouter from './routes/report.routes';
import workoutRouter from './routes/workout.routes';
import dietRouter from './routes/diet.routes';
import leadRouter from './routes/lead.routes';

import { errorHandler } from './middleware/errorHandler';
import { initReminderCron } from './services/cron.service';

const app = express();

// Bootstrap notification templates in database asynchronously
initReminderCron().catch(err => console.error('Failed to bootstrap reminder templates:', err));

// Security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Development logging
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting (Allow 1000 requests per 15 mins for development)
const limiter = rateLimit({
  max: 1000,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes.'
});
app.use('/api', limiter);

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/members', memberRouter);
app.use('/api/trainers', trainerRouter);
app.use('/api/classes', classRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/branches', branchRouter);
app.use('/api/reports', reportRouter);
app.use('/api/workout', workoutRouter);
app.use('/api/diet', dietRouter);
app.use('/api/leads', leadRouter);

// Root path confirmation
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Gym Management API is healthy' });
});

// Handling unhandled routes
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handler
app.use(errorHandler);

export default app;
