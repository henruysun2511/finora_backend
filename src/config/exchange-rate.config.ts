import 'dotenv/config';

export const ExchangeRateConfig = {
  API_URL:
    process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest',
  API_KEY: process.env.EXCHANGE_RATE_API_KEY || '',
  CACHE_TTL_SECONDS: parseInt(
    process.env.EXCHANGE_RATE_CACHE_TTL_SECONDS || '3600',
    10,
  ),
  TIMEOUT_MS: parseInt(process.env.EXCHANGE_RATE_TIMEOUT_MS || '5000', 10),
} as const;
