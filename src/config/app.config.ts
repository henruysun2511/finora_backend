import 'dotenv/config';

export const AppConfig = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production',
} as const;
