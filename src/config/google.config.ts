import 'dotenv/config';

export const GoogleConfig = {
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ??
    'http://localhost:3000/api/v1/auth/google/callback',
} as const;
