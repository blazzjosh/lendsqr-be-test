import { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import WalletService from '../services/WalletService.js';
import UserService from '../services/UserService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

/**
 * WalletController
 * 
 * Handles HTTP requests for wallet operations
 */
export class WalletController {
  private walletService: WalletService;
  private userService: UserService;

  constructor(walletService?: WalletService, userService?: UserService) {
    this.walletService = walletService || new WalletService();
    this.userService = userService || new UserService();
  }

  /**
   * Get wallet balance
   * GET /api/wallet/balance
   * Requires authentication
   */
  getBalance = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;

    const balance = await this.walletService.getBalance(userId);

    res.status(200).json({
      success: true,
      message: 'Balance retrieved successfully',
      data: {
        balance,
      },
    });
  });

  /**
   * Fund wallet
   * POST /api/wallet/fund
   * Requires authentication
   */
  fundWallet = asyncHandler(async (req: Request, res: Response) => {
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

    const { amount, description } = req.body;

    const transaction = await this.walletService.fundWallet(userId, {
      amount: parseFloat(amount),
      description,
    });

    res.status(200).json({
      success: true,
      message: 'Wallet funded successfully',
      data: transaction,
    });
  });

  /**
   * Transfer funds to another user
   * POST /api/wallet/transfer
   * Requires authentication
   */
  transferFunds = asyncHandler(async (req: Request, res: Response) => {
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

    const { recipient_email, amount, description } = req.body;

    const result = await this.walletService.transferFunds(
      userId,
      recipient_email,
      parseFloat(amount),
      description
    );

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        senderTransaction: result.senderTransaction,
        recipientTransaction: result.recipientTransaction,
      },
    });
  });

  /**
   * Withdraw funds from wallet
   * POST /api/wallet/withdraw
   * Requires authentication
   */
  withdrawFunds = asyncHandler(async (req: Request, res: Response) => {
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

    const { amount, description } = req.body;

    const transaction = await this.walletService.withdrawFunds(
      userId,
      parseFloat(amount),
      description
    );

    res.status(200).json({
      success: true,
      message: 'Withdrawal completed successfully',
      data: transaction,
    });
  });

  /**
   * Get transaction history
   * GET /api/wallet/transactions
   * Requires authentication
   */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
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

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await this.walletService.getTransactionHistory(userId, limit, offset);
    const total = await this.walletService.getTransactionCount(userId);

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: transactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  });
}

/**
 * Validation rules for fund wallet
 */
export const validateFundWallet = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0')
    .custom((value) => {
      // Check for valid decimal places (max 2)
      const decimalPart = value.toString().split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        throw new Error('Amount can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be maximum 500 characters'),
];

/**
 * Validation rules for transfer funds
 */
export const validateTransferFunds = [
  body('recipient_email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid recipient email is required'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0')
    .custom((value) => {
      const decimalPart = value.toString().split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        throw new Error('Amount can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be maximum 500 characters'),
];

/**
 * Validation rules for withdraw funds
 */
export const validateWithdrawFunds = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0')
    .custom((value) => {
      const decimalPart = value.toString().split('.')[1];
      if (decimalPart && decimalPart.length > 2) {
        throw new Error('Amount can have maximum 2 decimal places');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be maximum 500 characters'),
];

/**
 * Validation rules for get transactions
 */
export const validateGetTransactions = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be 0 or greater'),
];

export default WalletController;
