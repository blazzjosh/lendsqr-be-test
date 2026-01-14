/**
 * Test Utilities
 * 
 * Helper functions for testing
 */

import db from '../../database/connection.js';
import { User, Wallet } from '../../types/index.js';
import BlacklistService from '../../services/BlacklistService.js';
import UserService from '../../services/UserService.js';
import AuthService from '../../services/AuthService.js'

/**
 * Create a mock blacklist service that always passes
 */
export function createMockBlacklistService(): BlacklistService {
  const mockService = new BlacklistService();
  mockService.checkBlacklist = jest.fn().mockResolvedValue({
    isBlacklisted: false,
  });
  return mockService;
}

/**
 * Create a test user with wallet
 */
export async function createTestUser(
  email: string = 'test@example.com',
  password: string = 'TestPassword123!'
): Promise<{ user: User; wallet: Wallet; token: string }> {
  const mockBlacklist = createMockBlacklistService();
  const userService = new UserService(undefined, mockBlacklist, undefined);
  const authService = new AuthService();

  const userData = {
    email,
    phone_number: `+234${Math.floor(Math.random() * 10000000000)}`,
    password,
    first_name: 'Test',
    last_name: 'User',
  };

  const userResponse = await userService.createUser(userData);

  // Get full user with password
  const user = await db('users').where({ id: userResponse.id }).first<User>();
  const wallet = await db('wallets').where({ user_id: user.id }).first<Wallet>();
  const { token } = await authService.createAuthToken(user.id);

  return { user, wallet, token };
}

/**
 * Clean up test user and associated data
 */
export async function cleanupTestUser(userId: number): Promise<void> {
  await db('auth_tokens').where({ user_id: userId }).delete();
  await db('transactions').whereIn('wallet_id',
    db('wallets').select('id').where({ user_id: userId })
  ).delete();
  await db('wallets').where({ user_id: userId }).delete();
  await db('users').where({ id: userId }).delete();
}

/**
 * Clean up all test data
 */
export async function cleanupAllTestData(): Promise<void> {
  await db('auth_tokens').delete();
  await db('transactions').delete();
  await db('wallets').delete();
  await db('users').delete();
}

/**
 * Reset database tables for testing
 */
export async function resetDatabase(): Promise<void> {
  await db('auth_tokens').truncate();
  await db('transactions').truncate();
  await db('wallets').truncate();
  await db('users').truncate();
}
