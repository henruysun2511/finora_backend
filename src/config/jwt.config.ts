import 'dotenv/config';

export const JwtConfig = {
  SECRET:
    process.env.JWT_SECRET ?? 'finora-default-secret-key-change-in-production',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1d',
  REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ??
    'finora-default-refresh-secret-key-change-in-production',
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
} as const;
