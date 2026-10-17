// src/modules/accounts/accounts.constant.ts
import { WalletMemberRole } from '../../common/enums/wallet-member-role.enum';

export const SUPPORTED_CURRENCIES = ['VND', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'SGD'] as const;

export const MAX_MONEY_AMOUNT = 999_999_999_999.99;

// Vai trò trong Wallet được phép ghi (tạo/sửa/xóa/lưu trữ/điều chỉnh). VIEWER chỉ được đọc.
export const ACCOUNT_WRITE_ROLES: WalletMemberRole[] = [
  WalletMemberRole.OWNER,
  WalletMemberRole.EDITOR,
];

export const ACCOUNT_ERROR_CODE = {
  NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  WALLET_NOT_FOUND: 'ACCOUNT_WALLET_NOT_FOUND',
  ACCESS_DENIED: 'ACCOUNT_ACCESS_DENIED',
  NAME_ALREADY_EXISTS: 'ACCOUNT_NAME_ALREADY_EXISTS',
  ARCHIVED: 'ACCOUNT_ARCHIVED',
  HAS_TRANSACTIONS: 'ACCOUNT_HAS_TRANSACTIONS',
  CURRENCY_CHANGE_NOT_ALLOWED: 'ACCOUNT_CURRENCY_CHANGE_NOT_ALLOWED',
  INSUFFICIENT_BALANCE: 'ACCOUNT_INSUFFICIENT_BALANCE',
  IDEMPOTENCY_KEY_REQUIRED: 'ACCOUNT_IDEMPOTENCY_KEY_REQUIRED',
} as const;