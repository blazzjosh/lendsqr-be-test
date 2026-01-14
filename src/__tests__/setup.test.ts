/**
 * Test Setup Verification
 * 
 * Verifies that the test environment is configured correctly
 */

import db from '../database/connection.js';

describe('Test Environment Setup', () => {
  beforeAll(async () => {
    // Run migrations on test database
    await db.migrate.latest();
    console.log('✅ Test database migrations completed');
  });

  it('should connect to test database', async () => {
    const result = await db.raw('SELECT 1 + 1 as result');
    expect(result[0][0].result).toBe(2);
  });

  it('should use test database', async () => {
    const [result] = await db.raw('SELECT DATABASE() as db');
    const dbName = result[0].db;
    expect(dbName).toContain('test');
  });

  it('should have all required tables', async () => {
    const tables = await db.raw('SHOW TABLES');
    const tableNames = tables[0].map((row: any) => Object.values(row)[0]);
    
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('wallets');
    expect(tableNames).toContain('transactions');
    expect(tableNames).toContain('auth_tokens');
    expect(tableNames).toContain('knex_migrations');
  });

  afterAll(async () => {
    await db.destroy();
  });
});
