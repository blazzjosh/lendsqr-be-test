import db from '../database/connection.js';
import AuthService from './AuthService.js';
import BlacklistService from './BlacklistService.js';
import WalletService from './WalletService.js';
import {
  User,
  UserResponse,
  CreateUserInput,
} from '../types/index.js';

/**
 * UserService
 * 
 * Handles user operations:
 * - User creation with blacklist verification
 * - Atomic user + wallet creation
 * - User profile management
 * - Dependency injection pattern
 */
export class UserService {
  private authService: AuthService;
  private blacklistService: BlacklistService;
  private walletService: WalletService;

  constructor(
    authService?: AuthService,
    blacklistService?: BlacklistService,
    walletService?: WalletService
  ) {
    // Dependency injection with default instantiation
    this.authService = authService || new AuthService();
    this.blacklistService = blacklistService || new BlacklistService();
    this.walletService = walletService || new WalletService();
  }

  /**
   * Create a new user with wallet
   * Includes blacklist verification and atomic creation
   * 
   * @param userData - User registration data
   * @returns Created user (without password)
   */
  async createUser(userData: CreateUserInput): Promise<UserResponse> {
    const { email, phone_number, password, first_name, last_name } = userData;

    // Step 1: Check if email already exists
    const existingEmail = await db('users')
      .where({ email })
      .first<User>();

    if (existingEmail) {
      throw new Error('Email already registered');
    }

    // Step 2: Check if phone number already exists
    const existingPhone = await db('users')
      .where({ phone_number })
      .first<User>();

    if (existingPhone) {
      throw new Error('Phone number already registered');
    }

    // Step 3: Check blacklist (CRITICAL - fail-safe)
    console.log(`Checking blacklist for ${email}...`);
    const blacklistCheck = await this.blacklistService.checkBlacklist(
      email,
      phone_number
    );

    if (blacklistCheck.isBlacklisted) {
      console.log(`User blocked: ${blacklistCheck.reason}`);
      throw new Error(
        `Cannot onboard user: ${blacklistCheck.reason || 'User is blacklisted'}`
      );
    }

    console.log(`Blacklist check passed for ${email}`);

    // Step 4: Hash password
    const hashedPassword = await this.authService.hashPassword(password);

    // Step 5: Create user and wallet in transaction (ATOMIC)
    return await db.transaction(async (trx) => {
      // Create user
      const [userId] = await trx('users').insert({
        email,
        phone_number,
        password: hashedPassword,
        first_name,
        last_name,
      });

      if (!userId) {
        throw new Error('Failed to create user');
      }

      // Create wallet for user
      await this.walletService.createWallet(userId, trx);

      // Get created user
      const user = await trx('users')
        .where({ id: userId })
        .first<User>();

      if (!user) {
        throw new Error('Failed to create user');
      }

      // Return user response (without password)
      return {
        id: user.id,
        email: user.email,
        phone_number: user.phone_number,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    });
  }

  /**
   * Get user by ID
   * 
   * @param userId - User ID
   * @returns User response (without password)
   */
  async getUserById(userId: number): Promise<UserResponse | null> {
    const user = await db('users')
      .where({ id: userId })
      .first<User>();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      phone_number: user.phone_number,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  /**
   * Get user by email
   * 
   * @param email - User email
   * @returns User response (without password)
   */
  async getUserByEmail(email: string): Promise<UserResponse | null> {
    const user = await db('users')
      .where({ email })
      .first<User>();

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      phone_number: user.phone_number,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  /**
   * Get user profile with wallet info
   * 
   * @param userId - User ID
   * @returns User with wallet balance
   */
  async getUserProfile(userId: number): Promise<UserResponse & { balance: number } | null> {
    const user = await this.getUserById(userId);

    if (!user) {
      return null;
    }

    const wallet = await this.walletService.getWalletByUserId(userId);
    const balance = wallet ? parseFloat(wallet.balance.toString()) : 0;

    return {
      ...user,
      balance,
    };
  }

  /**
   * Update user profile
   * 
   * @param userId - User ID
   * @param updates - Fields to update
   * @returns Updated user
   */
  async updateUserProfile(
    userId: number,
    updates: Partial<Pick<User, 'first_name' | 'last_name' | 'phone_number'>>
  ): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await this.getUserById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // If updating phone number, check it's not already taken
    if (updates.phone_number) {
      const existingPhone = await db('users')
        .where({ phone_number: updates.phone_number })
        .whereNot({ id: userId })
        .first<User>();

      if (existingPhone) {
        throw new Error('Phone number already in use');
      }
    }

    // Update user
    await db('users')
      .where({ id: userId })
      .update({
        ...updates,
        updated_at: db.fn.now(),
      });

    // Get updated user
    const updatedUser = await this.getUserById(userId);

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    return updatedUser;
  }

  /**
   * Delete user account (with cascade to wallet and transactions)
   * 
   * @param userId - User ID
   */
  async deleteUser(userId: number): Promise<void> {
    const user = await this.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Delete user (wallet and transactions will cascade due to foreign keys)
    await db('users')
      .where({ id: userId })
      .delete();
  }
}

export default UserService;
