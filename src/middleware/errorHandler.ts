import { Request, Response, NextFunction } from 'express';

/**
 * Custom Error class with status code
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async handler wrapper
 * Eliminates need for try-catch in route handlers
 * 
 * @param fn - Async route handler function
 * @returns Wrapped function that catches errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Centralized error handler middleware
 * 
 * Catches all errors and returns consistent error response
 * Should be registered last in middleware chain
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error for debugging
  console.error('Error occurred:');
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  console.error('Request:', {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal server error';
  let errorDetails = err.message;

  // Handle known error types
  if (err instanceof AppError) {
    // Custom application errors
    statusCode = err.statusCode;
    message = err.message;
    errorDetails = err.message;
  } else if (err.name === 'ValidationError') {
    // Validation errors (express-validator)
    statusCode = 400;
    message = 'Validation failed';
    errorDetails = err.message;
  } else if (err.code === 'ER_DUP_ENTRY') {
    // MySQL duplicate entry error
    statusCode = 409;
    message = 'Duplicate entry';
    errorDetails = 'Resource already exists';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    // MySQL foreign key constraint error
    statusCode = 400;
    message = 'Invalid reference';
    errorDetails = 'Referenced resource does not exist';
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid token';
    errorDetails = err.message;
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    statusCode = 401;
    message = 'Token expired';
    errorDetails = 'Please login again';
  } else if (err.type === 'entity.parse.failed') {
    // JSON parse error
    statusCode = 400;
    message = 'Invalid JSON';
    errorDetails = 'Request body contains invalid JSON';
  }

  // Handle specific error messages from services
  if (err.message) {
    if (err.message.includes('not found')) {
      statusCode = 404;
      message = 'Resource not found';
    } else if (err.message.includes('already exists') || err.message.includes('already registered')) {
      statusCode = 409;
      message = 'Resource already exists';
    } else if (err.message.includes('Insufficient balance')) {
      statusCode = 400;
      message = 'Insufficient balance';
    } else if (err.message.includes('blacklist')) {
      statusCode = 403;
      message = 'User cannot be onboarded';
    } else if (err.message.includes('Invalid') || err.message.includes('must be')) {
      statusCode = 400;
      message = 'Validation error';
    }
  }

  // Don't send stack trace in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: message,
    error: errorDetails,
    ...(isDevelopment && { stack: err.stack }),
    ...(isDevelopment && { type: err.name }),
  });
}

/**
 * 404 Not Found handler
 * Should be registered before error handler
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: `Cannot ${req.method} ${req.url}`,
  });
}

/**
 * Helper function to create errors
 * 
 * @param message - Error message
 * @param statusCode - HTTP status code
 */
export function createError(message: string, statusCode: number = 500): AppError {
  return new AppError(message, statusCode);
}

export default errorHandler;
