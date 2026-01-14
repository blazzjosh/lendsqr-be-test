/**
 * Test Database Setup
 * 
 * Sets up test database before running tests
 */

import db from '../../database/connection.js';

export async function setupTestDatabase(): Promise<void> {
  try {
    // Check if test database exists and is accessible
    await db.raw('SELECT 1');
    console.log('✅ Test database connected');

    // Run migrations if needed
    const migrations = await db.migrate.currentVersion();
    console.log('Current migration version:', migrations);

    // Check if tables exist
    const tables = await db.raw('SHOW TABLES');
    console.log('Tables:', tables[0].length);

    if (tables[0].length === 0) {
      console.log('Running migrations...');
      await db.migrate.latest();
      console.log('✅ Migrations completed');
    }
  } catch (error: any) {
    console.error('❌ Test database setup failed:', error.message);
    throw error;
  }
}

export async function teardownTestDatabase(): Promise<void> {
  try {
    await db.destroy();
    console.log('✅ Database connection closed');
  } catch (error: any) {
    console.error('❌ Database teardown failed:', error.message);
  }
}
