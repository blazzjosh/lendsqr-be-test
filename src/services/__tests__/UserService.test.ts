/**
 * UserService Integration Tests
 * 
 * Tests user operations with blacklist integration
 */

import { jest } from '@jest/globals';
import UserService from '../UserService.js';
import BlacklistService from '../BlacklistService.js';
import db from '../../database/connection.js';

// Helper to create mock blacklist service
function createMockBlacklistService(): BlacklistService {
  const mock = new BlacklistService();
  mock.checkBlacklist = jest.fn().mockResolvedValue({
    isBlacklisted: false,
    reason: 'User is not blacklisted',
  });
  return mock;
}

// Helper to cleanup test data
async function cleanupAllTestData() {
  await db('transactions').del();
  await db('wallets').del();
  await db('auth_tokens').del();
  await db('users').del();
}

describe('UserService', () => {
  let userService: UserService;
  let mockBlacklistService: BlacklistService;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    await cleanupAllTestData();
    mockBlacklistService = createMockBlacklistService();
    userService = new UserService(undefined, mockBlacklistService, undefined);
  });

  afterAll(async () => {
    await cleanupAllTestData();
    await db.destroy();
  });

  describe('Create User', () => {
    it('should create user with wallet (atomic)', async () => {
      const userData = {
        email: 'newuser@example.com',
        phone_number: '+2348011111111',
        password: 'Password123!',
        first_name: 'New',
        last_name: 'User',
      };

      const user = await userService.createUser(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe('newuser@example.com');
      expect(user.first_name).toBe('New');

      // Verify password is not returned
      expect((user as any).password).toBeUndefined();

      // Verify wallet was created
      const wallet = await db('wallets').where({ user_id: user.id }).first();
      expect(wallet).toBeDefined();
      expect(parseFloat(wallet.balance)).toBe(0);
    });

    it('should check blacklist before creating user', async () => {
      const userData = {
        email: 'checked@example.com',
        phone_number: '+2348022222222',
        password: 'Password123!',
        first_name: 'Checked',
        last_name: 'User',
      };

      await userService.createUser(userData);

      expect(mockBlacklistService.checkBlacklist).toHaveBeenCalledWith(
        'checked@example.com',
        '+2348022222222'
      );
    });

    it('should reject blacklisted user', async () => {
      // Create service with blacklist that rejects
      const rejectBlacklist = new BlacklistService();
      rejectBlacklist.checkBlacklist = jest.fn().mockResolvedValue({
        isBlacklisted: true,
        reason: 'User is blacklisted',
      });

      const strictUserService = new UserService(undefined, rejectBlacklist, undefined);

      const userData = {
        email: 'blacklisted@example.com',
        phone_number: '+2348033333333',
        password: 'Password123!',
        first_name: 'Bad',
        last_name: 'User',
      };

      await expect(strictUserService.createUser(userData)).rejects.toThrow('Cannot onboard user');
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        phone_number: '+2348044444444',
        password: 'Password123!',
        first_name: 'First',
        last_name: 'User',
      };

      await userService.createUser(userData);

      // Try to create again with same email
      const duplicateData = {
        ...userData,
        phone_number: '+2348055555555', // Different phone
      };

      await expect(userService.createUser(duplicateData)).rejects.toThrow('Email already registered');
    });

    it('should throw error for duplicate phone number', async () => {
      const userData = {
        email: 'user1@example.com',
        phone_number: '+2348066666666',
        password: 'Password123!',
        first_name: 'First',
        last_name: 'User',
      };

      await userService.createUser(userData);

      // Try to create with same phone
      const duplicateData = {
        ...userData,
        email: 'user2@example.com', // Different email
      };

      await expect(userService.createUser(duplicateData)).rejects.toThrow('Phone number already registered');
    });
  });

  describe('Get User', () => {
    it('should get user by ID', async () => {
      const userData = {
        email: 'getuser@example.com',
        phone_number: '+2348077777777',
        password: 'Password123!',
        first_name: 'Get',
        last_name: 'User',
      };

      const created = await userService.createUser(userData);
      const user = await userService.getUserById(created.id);

      expect(user).toBeDefined();
      expect(user?.email).toBe('getuser@example.com');
      expect((user as any)?.password).toBeUndefined();
    });

    it('should return null for non-existent user', async () => {
      const user = await userService.getUserById(99999);
      expect(user).toBeNull();
    });

    it('should get user by email', async () => {
      const userData = {
        email: 'byemail@example.com',
        phone_number: '+2348088888888',
        password: 'Password123!',
        first_name: 'By',
        last_name: 'Email',
      };

      await userService.createUser(userData);
      const user = await userService.getUserByEmail('byemail@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('byemail@example.com');
    });
  });

  describe('Get User Profile', () => {
    it('should get user profile with balance', async () => {
      const userData = {
        email: 'profile@example.com',
        phone_number: '+2348099999999',
        password: 'Password123!',
        first_name: 'Profile',
        last_name: 'User',
      };

      const created = await userService.createUser(userData);
      const profile = await userService.getUserProfile(created.id);

      expect(profile).toBeDefined();
      expect(profile?.email).toBe('profile@example.com');
      expect(profile?.balance).toBe(0);
    });
  });

  describe('Update User Profile', () => {
    it('should update user profile', async () => {
      const created = await userService.createUser({
        email: 'update@example.com',
        phone_number: '+2348010101010',
        password: 'Password123!',
        first_name: 'Original',
        last_name: 'User',
      });

      const updated = await userService.updateUserProfile(created.id, {
        first_name: 'Updated',
        last_name: 'Name',
      });

      expect(updated.first_name).toBe('Updated');
      expect(updated.last_name).toBe('Name');
      expect(updated.email).toBe('update@example.com');
    });

    it('should throw error when updating to duplicate phone', async () => {
      const user1 = await userService.createUser({
        email: 'user1@example.com',
        phone_number: '+2348011112222',
        password: 'Password123!',
        first_name: 'User',
        last_name: 'One',
      });

      const user2 = await userService.createUser({
        email: 'user2@example.com',
        phone_number: '+2348022223333',
        password: 'Password123!',
        first_name: 'User',
        last_name: 'Two',
      });

      await expect(
        userService.updateUserProfile(user2.id, {
          phone_number: user1.phone_number,
        })
      ).rejects.toThrow('Phone number already in use');
    });
  });

  describe('Delete User', () => {
    it('should delete user and cascade to wallet', async () => {
      const user = await userService.createUser({
        email: 'delete@example.com',
        phone_number: '+2348033334444',
        password: 'Password123!',
        first_name: 'Delete',
        last_name: 'User',
      });

      await userService.deleteUser(user.id);

      const deletedUser = await db('users').where({ id: user.id }).first();
      const deletedWallet = await db('wallets').where({ user_id: user.id }).first();

      expect(deletedUser).toBeUndefined();
      expect(deletedWallet).toBeUndefined();
    });

    it('should throw error when deleting non-existent user', async () => {
      await expect(userService.deleteUser(99999)).rejects.toThrow('User not found');
    });
  });
});