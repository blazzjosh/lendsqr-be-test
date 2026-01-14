// Jest setup file
// Runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'lendsqr_wallet_test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test hooks
beforeAll(async () => {
  console.log('🧪 Starting test suite...');
});

afterAll(async () => {
  console.log('✅ Test suite completed');
});
