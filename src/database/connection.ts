// Replace the connection.ts file with this corrected version:

import knex, { Knex } from 'knex';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
const environment = process.env.NODE_ENV || 'development';

// Create require function for ES modules
const require = createRequire(import.meta.url);

// Load knexfile.cjs
let knexConfig: any;
try {
  const knexfilePath = path.resolve(process.cwd(), 'knexfile.cjs');
  knexConfig = require(knexfilePath);
} catch (error) {
  console.error('Failed to load knexfile:', error);
  throw error;
}

const config = knexConfig[environment as keyof typeof knexConfig];
if (!config) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

const db: Knex = knex(config);

// Log connection info (not in test environment)
if (environment !== 'test') {
  console.log(`✅ Database connection initialized for environment: ${environment}`);
}

export default db;