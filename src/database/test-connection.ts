import db from './connection.js';

async function testConnection() {
  try {
    const result = await db.raw('SELECT 1 + 1 as result');
    console.log('Database query test:', result[0]);

    const tables = await db.raw('SHOW TABLES');
    console.log('Current tables:', tables[0]);

    await db.destroy()
    console.log('Connection test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Connection test failed:', error);
    process.exit(1);
  }
}

testConnection();
