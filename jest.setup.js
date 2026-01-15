// Jest setup file
// Runs before all tests

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'lendsqr_wallet_test';
