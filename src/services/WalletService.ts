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
 * - Transfers
 * - Withdrawals
 * - Transaction history
 */
export class WalletService {
  async createWallet(userId: number, trx?: Knex.Transaction): Promise<Wallet> {
    const dbInstance = trx || db;

    const [walletId] = await dbInstance('wallets').insert({
      user_id: userId,
      balance: 0.0,
    });

    const wallet = await dbInstance('wallets')
      .where({ id: walletId })
      .first<Wallet>();

    if (!wallet) {
      throw new Error('Failed to create wallet');
    }

    return wallet;
  }

  async getWalletByUserId(userId: number): Promise<Wallet | null> {
    return (
      (await db('wallets').where({ user_id: userId }).first<Wallet>()) || null
    );
  }

  async getWalletById(walletId: number): Promise<Wallet | null> {
    return (
      (await db('wallets').where({ id: walletId }).first<Wallet>()) || null
    );
  }

  async getBalance(userId: number): Promise<number> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) throw new Error('Wallet not found');
    return Number(wallet.balance);
  }

  async fundWallet(
    userId: number,
    input: FundWalletInput
  ): Promise<TransactionResponse> {
    const { amount, description } = input;

    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    return db.transaction(async (trx) => {
      const wallet = await trx('wallets')
        .where({ user_id: userId })
        .forUpdate()
        .first<Wallet>();

      if (!wallet) throw new Error('Wallet not found');

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + amount;

      await trx('wallets')
        .where({ id: wallet.id })
        .update({ balance: balanceAfter, updated_at: trx.fn.now() });

      const [transactionId] = await trx('transactions').insert({
        wallet_id: wallet.id,
        type: 'credit',
        amount,
        description: description || 'Wallet funding',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: 'funding',
      });

      const transaction = await trx('transactions')
        .where({ id: transactionId })
        .first<Transaction>();

      if (!transaction) throw new Error('Failed to create transaction');

      return this.mapTransaction(transaction);
    });
  }

  async transferFunds(
    senderId: number,
    recipientEmail: string,
    amount: number,
    description?: string
  ): Promise<{
    senderTransaction: TransactionResponse;
    recipientTransaction: TransactionResponse;
  }> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    return db.transaction(async (trx) => {
      const senderWallet = await trx('wallets')
        .where({ user_id: senderId })
        .forUpdate()
        .first<Wallet>();

      if (!senderWallet) throw new Error('Sender wallet not found');

      const recipientUser = await trx('users')
        .where({ email: recipientEmail })
        .first<{ id: number }>();

      if (!recipientUser) throw new Error('Recipient user not found');
      if (recipientUser.id === senderId) {
        throw new Error('Cannot transfer to your own wallet');
      }

      const recipientWallet = await trx('wallets')
        .where({ user_id: recipientUser.id })
        .forUpdate()
        .first<Wallet>();

      if (!recipientWallet) throw new Error('Recipient wallet not found');

      const senderBalanceBefore = Number(senderWallet.balance);
      if (senderBalanceBefore < amount) {
        throw new Error('Insufficient balance');
      }

      const recipientBalanceBefore = Number(recipientWallet.balance);
      const senderBalanceAfter = senderBalanceBefore - amount;
      const recipientBalanceAfter = recipientBalanceBefore + amount;

      await trx('wallets')
        .where({ id: senderWallet.id })
        .update({ balance: senderBalanceAfter, updated_at: trx.fn.now() });

      await trx('wallets')
        .where({ id: recipientWallet.id })
        .update({ balance: recipientBalanceAfter, updated_at: trx.fn.now() });

      const [senderTxId] = await trx('transactions').insert({
        wallet_id: senderWallet.id,
        type: 'debit',
        amount,
        description: description || `Transfer to ${recipientEmail}`,
        balance_before: senderBalanceBefore,
        balance_after: senderBalanceAfter,
        reference_type: 'transfer',
      });

      const [recipientTxId] = await trx('transactions').insert({
        wallet_id: recipientWallet.id,
        type: 'credit',
        amount,
        description: description || `Transfer from ${senderId}`,
        balance_before: recipientBalanceBefore,
        balance_after: recipientBalanceAfter,
        reference_id: senderTxId,
        reference_type: 'transfer',
      });

      await trx('transactions')
        .where({ id: senderTxId })
        .update({ reference_id: recipientTxId });

      const senderTransaction = await trx('transactions')
        .where({ id: senderTxId })
        .first<Transaction>();

      const recipientTransaction = await trx('transactions')
        .where({ id: recipientTxId })
        .first<Transaction>();

      if (!senderTransaction || !recipientTransaction) {
        throw new Error('Failed to create transfer records');
      }

      return {
        senderTransaction: this.mapTransaction(senderTransaction),
        recipientTransaction: this.mapTransaction(recipientTransaction),
      };
    });
  }

  async withdrawFunds(
    userId: number,
    amount: number,
    description?: string
  ): Promise<TransactionResponse> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    return db.transaction(async (trx) => {
      const wallet = await trx('wallets')
        .where({ user_id: userId })
        .forUpdate()
        .first<Wallet>();

      if (!wallet) throw new Error('Wallet not found');

      const balanceBefore = Number(wallet.balance);
      if (balanceBefore < amount) {
        throw new Error('Insufficient balance');
      }

      const balanceAfter = balanceBefore - amount;

      await trx('wallets')
        .where({ id: wallet.id })
        .update({ balance: balanceAfter, updated_at: trx.fn.now() });

      const [transactionId] = await trx('transactions').insert({
        wallet_id: wallet.id,
        type: 'debit',
        amount,
        description: description || 'Withdrawal',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_type: 'withdrawal',
      });

      const transaction = await trx('transactions')
        .where({ id: transactionId })
        .first<Transaction>();

      if (!transaction) throw new Error('Failed to create transaction');

      return this.mapTransaction(transaction);
    });
  }

  async getTransactionHistory(
    userId: number,
    limit = 50,
    offset = 0
  ): Promise<TransactionResponse[]> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) throw new Error('Wallet not found');

    const transactions = await db('transactions')
      .where({ wallet_id: wallet.id })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return transactions.map(this.mapTransaction);
  }

  async getTransactionCount(userId: number): Promise<number> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) throw new Error('Wallet not found');

    const result = await db('transactions')
      .where({ wallet_id: wallet.id })
      .count<{ count: number }>('id as count')
      .first();

    return Number(result?.count ?? 0);
  }

  private mapTransaction(transaction: Transaction): TransactionResponse {
    return {
      id: transaction.id,
      wallet_id: transaction.wallet_id,
      type: transaction.type,
      amount: Number(transaction.amount),
      description: transaction.description,
      balance_before: Number(transaction.balance_before),
      balance_after: Number(transaction.balance_after),
      reference_id: transaction.reference_id,
      reference_type: transaction.reference_type,
      created_at: transaction.created_at,
    };
  }
}

export default WalletService;
