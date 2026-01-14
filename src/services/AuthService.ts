import crypto from 'crypto';
import bcrypt from 'bcrypt';
import db from '../database/connection.js';
import { AuthToken, CreateAuthTokenInput, User } from '../types/index.js';

/**
 * AuthService
 * 
 * Handles authentication operations:
 * - Token generation and validation
 * - Password hashing and verification
 * - Login and logout
 */
export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly TOKEN_EXPIRY_HOURS: number;

  constructor() {
    this.TOKEN_EXPIRY_HOURS = parseInt(process.env.TOKEN_EXPIRY_HOURS || '24');
  }

  /**
   * Hash a password using bcrypt
   * 
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   * 
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if password matches
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random token
   * 
   * @returns 64-character hexadecimal token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create and store an auth token for a user
   * 
   * @param userId - User ID
   * @returns Token string and expiration date
   */
  async createAuthToken(userId: number): Promise<{ token: string; expiresAt: Date }> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    const tokenData: CreateAuthTokenInput = {
      user_id: userId,
      token,
      expires_at: expiresAt,
    };

    await db('auth_tokens').insert(tokenData);

    return { token, expiresAt };
  }

  /**
   * Validate a token and return associated user
   * 
   * @param token - Token string
   * @returns User object if valid, null otherwise
   */
  async validateToken(token: string): Promise<User | null> {
    // Find token in database
    const authToken = await db('auth_tokens')
      .where({ token, is_active: true })
      .first<AuthToken>();

    if (!authToken) {
      return null;
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(authToken.expires_at);
    
    if (expiresAt < now) {
      // Token expired, deactivate it
      await this.invalidateToken(token);
      return null;
    }

    // Update last_used_at
    await db('auth_tokens')
      .where({ token })
      .update({ last_used_at: now });

    // Get associated user
    const user = await db('users')
      .where({ id: authToken.user_id })
      .first<User>();

    return user || null;
  }

  /**
   * Invalidate a token (logout)
   * 
   * @param token - Token to invalidate
   */
  async invalidateToken(token: string): Promise<void> {
    await db('auth_tokens')
      .where({ token })
      .update({ is_active: false });
  }

  /**
   * Invalidate all tokens for a user
   * 
   * @param userId - User ID
   */
  async invalidateAllUserTokens(userId: number): Promise<void> {
    await db('auth_tokens')
      .where({ user_id: userId })
      .update({ is_active: false });
  }

  /**
   * Login user with email and password
   * 
   * @param email - User email
   * @param password - Plain text password
   * @returns Token and user if successful, null otherwise
   */
  async login(email: string, password: string): Promise<{ token: string; user: User } | null> {
    // Find user by email
    const user = await db('users')
      .where({ email })
      .first<User>();

    if (!user) {
      return null;
    }

    // Verify password
    const passwordValid = await this.verifyPassword(password, user.password);
    
    if (!passwordValid) {
      return null;
    }

    // Create auth token
    const { token } = await this.createAuthToken(user.id);

    return { token, user };
  }

  /**
   * Logout user by invalidating token
   * 
   * @param token - Token to invalidate
   */
  async logout(token: string): Promise<void> {
    await this.invalidateToken(token);
  }

  /**
   * Clean up expired tokens (for scheduled jobs)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    
    const deletedCount = await db('auth_tokens')
      .where('expires_at', '<', now)
      .delete();

    return deletedCount;
  }

  /**
   * Get all active tokens for a user (for admin/debugging)
   * 
   * @param userId - User ID
   * @returns Array of active auth tokens
   */
  async getUserActiveTokens(userId: number): Promise<AuthToken[]> {
    const tokens = await db('auth_tokens')
      .where({ user_id: userId, is_active: true })
      .where('expires_at', '>', new Date())
      .select<AuthToken[]>('*');

    return tokens;
  }
}

export default AuthService;
