// src/modules/exchange-rates/exchange-rates.constant.ts

export const EXCHANGE_RATE_ERROR_CODE = {
  UNSUPPORTED_CURRENCY: 'EXCHANGE_RATE_UNSUPPORTED_CURRENCY',
  FETCH_FAILED: 'EXCHANGE_RATE_FETCH_FAILED',
  INVALID_AMOUNT: 'EXCHANGE_RATE_INVALID_AMOUNT',
} as const;

/** TTL cache tỷ giá: 1 giờ (3600 giây) */
export const EXCHANGE_RATE_CACHE_TTL_MS = 60 * 60 * 1000;

/** Timeout khi gọi API tỷ giá bên ngoài: 5 giây */
export const EXCHANGE_RATE_REQUEST_TIMEOUT_MS = 5000;

/** API tỷ giá mở miễn phí không yêu cầu API key */
export const DEFAULT_EXCHANGE_RATE_API_URL = 'https://open.er-api.com/v6/latest';

/**
 * Bảng snapshot tỷ giá dự phòng (Fallback Rates) quy đổi sang USD
 * Áp dụng khi API ngoài bị mất mạng hoặc timeout, đảm bảo giao dịch không bị đứt quãng.
 */
export const FALLBACK_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  VND: 25_450,
  EUR: 0.92,
  JPY: 154.5,
  GBP: 0.79,
  AUD: 1.52,
  SGD: 1.34,
};
