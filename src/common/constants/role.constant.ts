export const SYSTEM_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const WALLET_ROLES = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;

export type WalletRole = (typeof WALLET_ROLES)[keyof typeof WALLET_ROLES];
