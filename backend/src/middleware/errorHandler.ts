import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error occurred:', err);

  // Zod Validation Error
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Prisma Error Examples
  if (err.code && err.code.startsWith('P20')) {
    // Prisma unique constraint / foreign key violation, etc.
    if (err.code === 'P2002') {
      return res.status(400).json({
        status: 'fail',
        message: `Duplicate field value for unique key: ${err.meta?.target || 'unknown'}`
      });
    }
    return res.status(400).json({
      status: 'fail',
      message: err.message || 'Database error occurred'
    });
  }

  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  res.status(statusCode).json({
    status,
    message: err.message || 'Something went wrong on the server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
