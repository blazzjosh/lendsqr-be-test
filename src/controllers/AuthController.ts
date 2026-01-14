import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import AuthService from '../services/AuthService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import db from '../database/connection.js';
import { User } from '../types/index.js';

/**
 * AuthController
 * 
 * Handles HTTP requests for authentication operations
 */
export class AuthController {
  private authService: AuthService;

  constructor(authService?: AuthService) {
    this.authService = authService || new AuthService();
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await db('users')
      .where({ email })
      .first<User>();

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'Email or password is incorrect',
      });
      return;
    }

    // Verify password
    const passwordValid = await this.authService.verifyPassword(password, user.password);

    if (!passwordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        error: 'Email or password is incorrect',
      });
      return;
    }

    // Create auth token
    const { token, expiresAt } = await this.authService.createAuthToken(user.id);

    // Return user without password
    const userResponse = {
      id: user.id,
      email: user.email,
      phone_number: user.phone_number,
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        expiresAt,
        user: userResponse,
      },
    });
  });

  /**
   * Logout user
   * POST /api/auth/logout
   * Requires authentication
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Invalidate token
    await this.authService.invalidateToken(token);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  });

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   * Requires authentication
   */
  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;

    // Invalidate all user tokens
    await this.authService.invalidateAllUserTokens(userId);

    res.status(200).json({
      success: true,
      message: 'Logged out from all devices',
    });
  });

  /**
   * Verify token
   * GET /api/auth/verify
   * Requires authentication
   */
  verifyToken = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    // If we reach here, token is valid (middleware verified it)
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: authReq.user,
      },
    });
  });
}

/**
 * Validation rules for login
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export default AuthController;
