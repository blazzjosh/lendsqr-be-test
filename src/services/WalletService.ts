import { Knex } from 'knex';
import db from '../database/connection.js';
import {
  Wallet,
  Transaction,
  CreateTransactionInput,
  FundWalletInput,
  TransactionResponse,
} from '../types/index.js';

/**
 * WalletService
 * 
 * Handles wallet operations with transaction scoping:
 * - Wallet creation
 * - Balance management
 * - Fund operations
 * - Transaction history
 */
export class WalletService {
  /**
   * Create a wallet for a user
   * 
   * @param userId - User ID
   * @param trx - Optional transaction object
   * @returns Created wallet
   */
  async createWallet(userId: number, trx?: Knex.Transaction): Promise<Wallet> {
    const dbInstance = trx || db;

    const [walletId] = await dbInstance('wallets').insert({
      user_id: userId,
      balance: 0.00,
    });

    const wallet = await dbInstance('wallets')
      .where({ id: walletId })
      .first<Wallet>();

    if (!wallet) {
      throw new Error('Failed to create wallet');
    }

    return wallet;
  }

  /**
   * Get wallet by user ID
   * 
   * @param userId - User ID
   * @returns Wallet or null
   */
  async getWalletByUserId(userId: number): Promise<Wallet | null> {
    const wallet = await db('wallets')
      .where({ user_id: userId })
      .first<Wallet>();

    return wallet || null;
  }

  /**
   * Get wallet by wallet ID
   * 
   * @param walletId - Wallet ID
   * @returns Wallet or null
   */
  async getWalletById(walletId: number): Promise<Wallet | null> {
    const wallet = await db('wallets')
      .where({ id: walletId })
      .first<Wallet>();

    return wallet || null;
  }

  /**
   * Get wallet balance
   * 
   * @param userId - User ID
   * @returns Balance amount
   */
  async getBalance(userId: number): Promise<number> {
    const wallet = await this.getWalletByUserId(userId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return parseFloat(wallet.balance.toString());
  }

  /**
   * Fund a wallet (add money)
   * Uses transaction scoping for atomicity
   * 
   * @param userId - User ID
   * @param input - Fund wallet input
   * @returns Transaction record
   */
  async fundWallet(userId: number, input: FundWalletInput): Promise<TransactionResponse> {
    const { amount, description } = input;

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    // Use transaction for atomicity
    return await db.transaction(async (trx) => {
      // Get wallet with row lock
      const wallet = await trx('wallets')
        .where({ user_id: userId })
        .forUpdate()
        .first<Wallet>();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const balanceBefore = parseFloat(wallet.balance.toString());
      const balanceAfter = balanceBefore + amount;

      // Update wallet balance
      await trx('wallets')
        .where({ id: wallet.id })
        .update({
          balance: balanceAfter,
          updated_at: trx.fn.now(),
        });

      // Create transaction record
      const transactionData: CreateTransactionInput = {
        wallet_id: wallet.id,
        type: 'credit',
        amount,
        description: description || 'Wallet funding',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: 'funding',
      };

      const [transactionId] = await trx('transactions').insert(transactionData);

      // Get the created transaction
      const transaction = await trx('transactions')
        .where({ id: transactionId })
        .first<Transaction>();

      if (!transaction) {
        throw new Error('Failed to create transaction record');
      }

      return {
        id: transaction.id,
        wallet_id: transaction.wallet_id,
        type: transaction.type,
        amount: parseFloat(transaction.amount.toString()),
        description: transaction.description,
        balance_before: parseFloat(transaction.balance_before.toString()),
        balance_after: parseFloat(transaction.balance_after.toString()),
        reference_id: transaction.reference_id,
        reference_type: transaction.reference_type,
        created_at: transaction.created_at,
      };
    });
  }

  /**
   * Get transaction history for a wallet
   * 
   * @param userId - User ID
   * @param limit - Number of transactions to fetch (default 50)
   * @param offset - Offset for pagination (default 0)
   * @returns Array of transactions
   */
  async getTransactionHistory(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionResponse[]> {
    // Get user's wallet
    const wallet = await this.getWalletByUserId(userId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Get transactions
    const transactions = await db('transactions')
      .where({ wallet_id: wallet.id })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select<Transaction[]>('*');

    // Convert to response format
    return transactions.map((transaction) => ({
      id: transaction.id,
      wallet_id: transaction.wallet_id,
      type: transaction.type,
      amount: parseFloat(transaction.amount.toString()),
      description: transaction.description,
      balance_before: parseFloat(transaction.balance_before.toString()),
      balance_after: parseFloat(transaction.balance_after.toString()),
      reference_id: transaction.reference_id,
      reference_type: transaction.reference_type,
      created_at: transaction.created_at,
    }));
  }

  /**
   * Get transaction count for a wallet
   * 
   * @param userId - User ID
   * @returns Total number of transactions
   */
  async getTransactionCount(userId: number): Promise<number> {
    const wallet = await this.getWalletByUserId(userId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const result = await db('transactions')
      .where({ wallet_id: wallet.id })
      .count('id as count')
      .first<{ count: number }>();

    return result?.count || 0;
  }
}

export default WalletService;
