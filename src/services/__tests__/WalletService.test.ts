/**
 * WalletService Unit Tests
 * 
 * Tests wallet operations with transaction integrity
 */

import { jest } from '@jest/globals';
import WalletService from '../WalletService.js';
import db from '../../database/connection.js';
import { cleanupAllTestData, createTestUser } from '../../__tests__/helpers/testUtils.js';

describe('WalletService', () => {
  let walletService: WalletService;

  beforeAll(async () => {
    await db.migrate.latest();
  });

  beforeEach(async () => {
    walletService = new WalletService();
    await cleanupAllTestData();
  });

  afterAll(async () => {
    await cleanupAllTestData();
    await db.destroy();
  });

  describe('Wallet Creation', () => {
    it('should create a wallet for a user', async () => {
      const { user } = await createTestUser('create@example.com');
      
      // User already has a wallet from createTestUser
      const wallet = await walletService.getWalletByUserId(user.id);
      
      expect(wallet).toBeDefined();
      expect(wallet?.user_id).toBe(user.id);
      expect(parseFloat(wallet!.balance.toString())).toBe(0);
    });
  });

  describe('Get Balance', () => {
    it('should get wallet balance', async () => {
      const { user } = await createTestUser('balance@example.com');
      
      const balance = await walletService.getBalance(user.id);
      
      expect(balance).toBe(0);
    });

    it('should throw error if wallet not found', async () => {
      await expect(walletService.getBalance(99999)).rejects.toThrow('Wallet not found');
    });
  });

  describe('Fund Wallet', () => {
    it('should fund wallet successfully', async () => {
      const { user } = await createTestUser('fund@example.com');
      
      const transaction = await walletService.fundWallet(user.id, {
        amount: 1000,
        description: 'Test funding',
      });
      
      expect(transaction.type).toBe('credit');
      expect(transaction.amount).toBe(1000);
      expect(transaction.balance_before).toBe(0);
      expect(transaction.balance_after).toBe(1000);
      expect(transaction.description).toBe('Test funding');
    });

    it('should update wallet balance after funding', async () => {
      const { user } = await createTestUser('fundbalance@example.com');
      
      await walletService.fundWallet(user.id, { amount: 500 });
      const balance = await walletService.getBalance(user.id);
      
      expect(balance).toBe(500);
    });

    it('should throw error for negative amount', async () => {
      const { user } = await createTestUser('fundneg@example.com');
      
      await expect(
        walletService.fundWallet(user.id, { amount: -100 })
      ).rejects.toThrow('Amount must be greater than zero');
    });

    it('should throw error for zero amount', async () => {
      const { user } = await createTestUser('fundzero@example.com');
      
      await expect(
        walletService.fundWallet(user.id, { amount: 0 })
      ).rejects.toThrow('Amount must be greater than zero');
    });
  });

  describe('Transfer Funds', () => {
    it('should transfer funds between wallets', async () => {
      const { user: sender } = await createTestUser('sender@example.com');
      const { user: recipient } = await createTestUser('recipient@example.com');
      
      // Fund sender wallet
      await walletService.fundWallet(sender.id, { amount: 1000 });
      
      // Transfer
      const result = await walletService.transferFunds(
        sender.id,
        'recipient@example.com',
        500,
        'Test transfer'
      );
      
      expect(result.senderTransaction.type).toBe('debit');
      expect(result.senderTransaction.amount).toBe(500);
      expect(result.senderTransaction.balance_after).toBe(500);
      
      expect(result.recipientTransaction.type).toBe('credit');
      expect(result.recipientTransaction.amount).toBe(500);
      expect(result.recipientTransaction.balance_after).toBe(500);
    });

    it('should update both wallet balances after transfer', async () => {
      const { user: sender } = await createTestUser('sender2@example.com');
      const { user: recipient } = await createTestUser('recipient2@example.com');
      
      await walletService.fundWallet(sender.id, { amount: 1000 });
      await walletService.transferFunds(sender.id, 'recipient2@example.com', 300);
      
      const senderBalance = await walletService.getBalance(sender.id);
      const recipientBalance = await walletService.getBalance(recipient.id);
      
      expect(senderBalance).toBe(700);
      expect(recipientBalance).toBe(300);
    });

    it('should throw error for insufficient balance', async () => {
      const { user: sender } = await createTestUser('sender3@example.com');
      const { user: recipient } = await createTestUser('recipient3@example.com');
      
      await walletService.fundWallet(sender.id, { amount: 100 });
      
      await expect(
        walletService.transferFunds(sender.id, 'recipient3@example.com', 500)
      ).rejects.toThrow('Insufficient balance');
    });

    it('should throw error when transferring to self', async () => {
      const { user } = await createTestUser('self@example.com');
      
      await walletService.fundWallet(user.id, { amount: 1000 });
      
      await expect(
        walletService.transferFunds(user.id, 'self@example.com', 100)
      ).rejects.toThrow('Cannot transfer to your own wallet');
    });

    it('should throw error for non-existent recipient', async () => {
      const { user } = await createTestUser('sender4@example.com');
      
      await walletService.fundWallet(user.id, { amount: 1000 });
      
      await expect(
        walletService.transferFunds(user.id, 'nonexistent@example.com', 100)
      ).rejects.toThrow('Recipient user not found');
    });
  });

  describe('Withdraw Funds', () => {
    it('should withdraw funds successfully', async () => {
      const { user } = await createTestUser('withdraw@example.com');
      
      await walletService.fundWallet(user.id, { amount: 1000 });
      
      const transaction = await walletService.withdrawFunds(
        user.id,
        300,
        'Test withdrawal'
      );
      
      expect(transaction.type).toBe('debit');
      expect(transaction.amount).toBe(300);
      expect(transaction.balance_before).toBe(1000);
      expect(transaction.balance_after).toBe(700);
    });

    it('should update balance after withdrawal', async () => {
      const { user } = await createTestUser('withdraw2@example.com');
      
      await walletService.fundWallet(user.id, { amount: 500 });
      await walletService.withdrawFunds(user.id, 200);
      
      const balance = await walletService.getBalance(user.id);
      expect(balance).toBe(300);
    });

    it('should throw error for insufficient balance', async () => {
      const { user } = await createTestUser('withdraw3@example.com');
      
      await walletService.fundWallet(user.id, { amount: 100 });
      
      await expect(
        walletService.withdrawFunds(user.id, 500)
      ).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Transaction History', () => {
    it('should get transaction history', async () => {
      const { user } = await createTestUser('history@example.com');
      
      await walletService.fundWallet(user.id, { amount: 1000 });
      await walletService.withdrawFunds(user.id, 200);
      
      const transactions = await walletService.getTransactionHistory(user.id);
      
      expect(transactions.length).toBe(2);
      expect(transactions[0].type).toBe('debit'); // Most recent first
      expect(transactions[1].type).toBe('credit');
    });

    it('should support pagination', async () => {
      const { user } = await createTestUser('history2@example.com');
      
      // Create multiple transactions
      await walletService.fundWallet(user.id, { amount: 100 });
      await walletService.fundWallet(user.id, { amount: 200 });
      await walletService.fundWallet(user.id, { amount: 300 });
      
      const firstPage = await walletService.getTransactionHistory(user.id, 2, 0);
      const secondPage = await walletService.getTransactionHistory(user.id, 2, 2);
      
      expect(firstPage.length).toBe(2);
      expect(secondPage.length).toBe(1);
    });

    it('should get transaction count', async () => {
      const { user } = await createTestUser('count@example.com');
      
      await walletService.fundWallet(user.id, { amount: 100 });
      await walletService.fundWallet(user.id, { amount: 200 });
      
      const count = await walletService.getTransactionCount(user.id);
      
      expect(count).toBe(2);
    });
  });
});
