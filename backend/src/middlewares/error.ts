import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // Log standard trace for developer audit
  console.error(`[Error Boundary] API Error Caught:`, err);

  // Mongoose Bad ObjectId (Cast Error)
  if (err.name === 'CastError') {
    const message = `Resource not found with format id of ${err.value}`;
    error = { message, statusCode: 404 };
  }

  // Mongoose Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    const message = `Duplicate field value entered. A record with this unique value already exists.`;
    error = { message, statusCode: 400 };
  }

  // Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((val: any) => val.message)
      .join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Web Token is invalid, authorization denied.', statusCode: 401 };
  }
  if (err.name === 'TokenExpiredError') {
    error = { message: 'Web Token expired, session expired.', statusCode: 401 };
  }

  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
