/**
 * API Routes
 * 
 * This file defines all API routes for the application.
 * Routes are organized by resource (users, auth, wallet) following
 * RESTful conventions and semantic naming.
 * 
 * Design Patterns:
 * - RESTful API Design: Semantic resource naming
 * - Separation of Concerns: Routes delegate to controllers
 * - Middleware Pattern: Authentication and validation
 */

import { Router } from 'express';
import UserController, { validateUserRegistration, validateProfileUpdate } from '../controllers/UserController.js';
import AuthController, { validateLogin } from '../controllers/AuthController.js';
import WalletController, {
  validateFundWallet,
  validateTransferFunds,
  validateWithdrawFunds,
  validateGetTransactions,
} from '../controllers/WalletController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Initialize controllers
const userController = new UserController();
const authController = new AuthController();
const walletController = new WalletController();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Login - Public
router.post('/auth/login', validateLogin, authController.login);

// Logout - Protected
router.post('/auth/logout', authenticate, authController.logout);

// Logout from all devices - Protected
router.post('/auth/logout-all', authenticate, authController.logoutAll);

// Verify token - Protected
router.get('/auth/verify', authenticate, authController.verifyToken);

/**
 * User Routes
 * Base path: /api/users
 */

// Register new user - Public
router.post('/users/register', validateUserRegistration, userController.register);

// Get current user profile - Protected
router.get('/users/me', authenticate, userController.getProfile);

// Update current user profile - Protected
router.put('/users/me', authenticate, validateProfileUpdate, userController.updateProfile);

/**
 * Wallet Routes
 * Base path: /api/wallet
 * All wallet operations require authentication
 */

// Get wallet balance - Protected
router.get('/wallet/balance', authenticate, walletController.getBalance);

// Fund wallet - Protected
router.post('/wallet/fund', authenticate, validateFundWallet, walletController.fundWallet);

// Transfer funds to another user - Protected
router.post('/wallet/transfer', authenticate, validateTransferFunds, walletController.transferFunds);

// Withdraw funds - Protected
router.post('/wallet/withdraw', authenticate, validateWithdrawFunds, walletController.withdrawFunds);

// Get transaction history - Protected
router.get('/wallet/transactions', authenticate, validateGetTransactions, walletController.getTransactions);

/**
 * Health Check Route
 * Base path: /api
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
