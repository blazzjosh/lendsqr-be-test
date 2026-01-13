import db from './connection.js';

async function resetDatabase() {
  try {
    console.log('🗑️  Resetting database...');
    
    // Disable foreign key checks
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');
    
    // Get all tables
    const [tables] = await db.raw('SHOW TABLES');
    const tableNames = tables.map((row: any) => Object.values(row)[0]);
    
    console.log(`Found ${tableNames.length} tables:`, tableNames);
    
    // Drop all tables
    for (const tableName of tableNames) {
      console.log(`  Dropping table: ${tableName}`);
      await db.raw(`DROP TABLE IF EXISTS \`${tableName}\``);
    }
    
    // Re-enable foreign key checks
    await db.raw('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Database reset complete!');
    console.log('Run "npm run migrate:latest" to recreate tables');
    
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

resetDatabase();
