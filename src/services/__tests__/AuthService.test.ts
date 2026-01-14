/**
 * AuthService Unit Tests
 */

import AuthService from '../AuthService.js';
import db from '../../database/connection.js';
import { cleanupAllTestData } from '../../__tests__/helpers/testUtils.js';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    authService = new AuthService();
    await cleanupAllTestData();
  });

  afterAll(async () => {
    await cleanupAllTestData();
    await db.destroy();
  });

  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);
      const isValid = await authService.verifyPassword('WrongPassword', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate a unique token', () => {
      const token = authService.generateToken();

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
      expect(typeof token).toBe('string');
    });

    it('should generate different tokens each time', () => {
      const token1 = authService.generateToken();
      const token2 = authService.generateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('Token Management', () => {
    let userId: number;

    beforeEach(async () => {
      const [id] = await db('users').insert({
        email: 'token@example.com',
        phone_number: '+2348099999999',
        password: 'hashedpassword',
        first_name: 'Token',
        last_name: 'Test',
      });
      userId = id;
    });

    it('should create an auth token', async () => {
      const { token, expiresAt } = await authService.createAuthToken(userId);

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should validate a valid token', async () => {
      const { token } = await authService.createAuthToken(userId);
      const user = await authService.validateToken(token);

      expect(user).toBeDefined();
      expect(user?.id).toBe(userId);
      expect(user?.email).toBe('token@example.com');
    });

    it('should return null for invalid token', async () => {
      const user = await authService.validateToken('invalid_token_12345');

      expect(user).toBeNull();
    });

    it('should invalidate a token', async () => {
      const { token } = await authService.createAuthToken(userId);
      
      await authService.invalidateToken(token);
      
      const user = await authService.validateToken(token);
      expect(user).toBeNull();
    });
  });

  describe('Login', () => {
    const email = 'login@example.com';
    const password = 'TestPassword123!';
    let userId: number;

    beforeEach(async () => {
      const hashedPassword = await authService.hashPassword(password);
      const [id] = await db('users').insert({
        email,
        phone_number: '+2348088888888',
        password: hashedPassword,
        first_name: 'Login',
        last_name: 'Test',
      });
      userId = id;
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login(email, password);

      expect(result).toBeDefined();
      expect(result?.token).toBeDefined();
      expect(result?.user.id).toBe(userId);
      expect(result?.user.email).toBe(email);
    });

    it('should return null for wrong email', async () => {
      const result = await authService.login('wrong@example.com', password);

      expect(result).toBeNull();
    });

    it('should return null for wrong password', async () => {
      const result = await authService.login(email, 'WrongPassword');

      expect(result).toBeNull();
    });
  });
});
