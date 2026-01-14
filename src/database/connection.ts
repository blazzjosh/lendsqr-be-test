import knex, { Knex } from 'knex';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import path from 'path';

// Load environment variables
dotenv.config();

// Create require function for ES modules
const require = createRequire(import.meta.url);

// Determine environment
const environment = process.env.NODE_ENV || 'development';

// Load knex configuration from .cjs file
let knexConfig: any;
try {
  const knexfilePath = path.resolve(process.cwd(), 'knexfile.cjs');
  knexConfig = require(knexfilePath);
} catch (error) {
  console.error('Failed to load knexfile:', error);
  throw error;
}

// Get configuration for current environment
const config = knexConfig[environment as keyof typeof knexConfig];

if (!config) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

// Create and export database instance (Singleton pattern)
const db: Knex = knex(config);

// Test database connection (only in non-test environment to reduce noise)
if (environment !== 'test') {
  db.raw('SELECT 1')
    .then(() => {
      console.log(`✅ Database connected successfully (${environment})`);
    })
    .catch((err: Error) => {
      console.error('❌ Database connection failed:', err.message);
    });
}

export default db;
