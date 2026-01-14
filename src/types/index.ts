// ============================================
// USER TYPES
// ============================================

export interface User {
  id: number;
  email: string;
  phone_number: string;
  password: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  phone_number: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface UserResponse {
  id: number;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// WALLET TYPES
// ============================================

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

export interface WalletResponse {
  id: number;
  user_id: number;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// TRANSACTION TYPES
// ============================================

export type TransactionType = 'credit' | 'debit';

export type ReferenceType = 'transfer' | 'funding' | 'withdrawal';

export interface Transaction {
  id: number;
  wallet_id: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  balance_before: number;
  balance_after: number;
  reference_id: number | null;
  reference_type: ReferenceType | null;
  created_at: Date;
}

export interface TransactionResponse {
  id: number;
  wallet_id: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  balance_before: number;
  balance_after: number;
  reference_id: number | null;
  reference_type: ReferenceType | null;
  created_at: Date;
}

export interface CreateTransactionInput {
  wallet_id: number;
  type: TransactionType;
  amount: number;
  description?: string;
  balance_before: number;
  balance_after: number;
  reference_id?: number;
  reference_type?: ReferenceType;
}

// ============================================
// AUTH TOKEN TYPES
// ============================================

export interface AuthToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  last_used_at: Date | null;
}

export interface CreateAuthTokenInput {
  user_id: number;
  token: string;
  expires_at: Date;
}

// ============================================
// WALLET OPERATION TYPES
// ============================================

export interface FundWalletInput {
  amount: number;
  description?: string;
}

export interface TransferFundsInput {
  recipient_email: string;
  amount: number;
  description?: string;
}

export interface WithdrawFundsInput {
  amount: number;
  description?: string;
}

// ============================================
// AUTH TYPES
// ============================================

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

// ============================================
// BLACKLIST TYPES
// ============================================

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  reason?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================
// REQUEST EXTENSIONS (for Express)
// ============================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

// ============================================
// SERVICE METHOD PARAMETER TYPES
// ============================================

export interface TransferParams {
  senderId: number;
  recipientId: number;
  amount: number;
  description?: string;
}

export interface GetTransactionsParams {
  walletId: number;
  limit?: number;
  offset?: number;
}

// ============================================
// MIDDLEWARE TYPES (Extended Request)
// ============================================

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}
