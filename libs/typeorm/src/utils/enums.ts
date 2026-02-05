export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum WalletStatus {
  FROZEN = 'frozen',
  ACTIVE = 'active',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum TransactionDescription {
  WALLET_TOPUP = 'Wallet topup',
  WITHDRAWAL = 'Withdrawal',
  ADMIN_WALLET_TOPUP = 'Admin wallet topup',
  ADMIN_WALLET_DEDUCTION = 'Admin wallet deduction',
  FX_EXCHANGE = 'FX Exchange',
}

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
}

export enum WithdrawalStatus {
  PROCESSING = 'processing',
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
}

export enum WithdrawalFeeType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum PaymentProvider {
  MONNIFY = 'monnify',
  PAYSTACK = 'paystack',
}
