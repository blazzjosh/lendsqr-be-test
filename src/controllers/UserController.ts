import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import UserService from '../services/UserService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { CreateUserInput } from '../types/index.js';

/**
 * UserController
 * 
 * Handles HTTP requests for user operations
 */
export class UserController {
  private userService: UserService;

  constructor(userService?: UserService) {
    this.userService = userService || new UserService();
  }

  /**
   * Register a new user
   * POST /api/users/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
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

    const userData: CreateUserInput = {
      email: req.body.email,
      phone_number: req.body.phone_number,
      password: req.body.password,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
    };

    // Create user
    const user = await this.userService.createUser(userData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  });

  /**
   * Get current user profile
   * GET /api/users/me
   * Requires authentication
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;

    // Get user profile with wallet balance
    const profile = await this.userService.getUserProfile(userId);

    if (!profile) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profile,
    });
  });

  /**
   * Update user profile
   * PUT /api/users/me
   * Requires authentication
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
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

    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;

    const updates = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone_number: req.body.phone_number,
    };

    // Update user profile
    const updatedUser = await this.userService.updateUserProfile(userId, updates);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  });
}

/**
 * Validation rules for user registration
 */
export const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),

  body('phone_number')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required (E.164 format)'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('first_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required (max 100 characters)'),

  body('last_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required (max 100 characters)'),
];

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be 1-100 characters'),

  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be 1-100 characters'),

  body('phone_number')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required (E.164 format)'),
];

export default UserController;
