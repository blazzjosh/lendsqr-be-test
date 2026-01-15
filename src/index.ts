/**
 * Main App Entry Point
 */

import express, { Application } from 'express';
import cors from 'cors';
import * as helmetModule from 'helmet';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import db from './database/connection.js';

// Load environment variables
dotenv.config();

// Handle helmet import for different build environments (Heroku/Vercel compatibility)
// @ts-ignore - helmet module resolution varies between environments
const helmet: any = helmetModule.default || helmetModule;

/**
 * Create and configure Express application
 * 
 * @returns Configured Express application
 */
function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet()); // Sets various HTTP headers for security

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging middleware (development only)
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  // Root health check
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Lendsqr Wallet API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api',
        docs: '/api/health',
      },
    });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Lendsqr Wallet API',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // API routes (all routes prefixed with /api)
  app.use('/api', routes);

  // 404 handler for undefined routes (must be before error handler)
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

// Initialize application
const app = createApp();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('Demo - Lendsqr Wallet API Server');
  console.log('='.repeat(50));
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
  console.log('='.repeat(50));
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST   /api/auth/login');
  console.log('  POST   /api/auth/logout');
  console.log('  POST   /api/users/register');
  console.log('  GET    /api/users/me');
  console.log('  GET    /api/wallet/balance');
  console.log('  POST   /api/wallet/fund');
  console.log('  POST   /api/wallet/transfer');
  console.log('  POST   /api/wallet/withdraw');
  console.log('  GET    /api/wallet/transactions');
  console.log('');
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} signal received: Starting graceful shutdown`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('HTTP server closed');

    // Close database connection
    try {
      await db.destroy();
      console.log('Database connection closed');
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error closing database connection:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
