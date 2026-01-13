import knex from 'knex';
import type { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';

import knexConfig from '../../knexfile.js';

const config = knexConfig[environment as keyof typeof knexConfig];

if (!config) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

const db: Knex = knex(config);

db.raw('SELECT 1')
  .then(() => {
    console.log(`Database connected successfully (${environment})`);
  })
  .catch((err: Error) => {
    console.error('Database connection failed:', err.message);
  });

export default db;
