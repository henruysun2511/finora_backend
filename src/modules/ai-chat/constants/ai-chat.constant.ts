// src/modules/ai-chat/constants/ai-chat.constant.ts

export const AI_CHAT_ERROR_CODE = {
  WALLET_ACCESS_DENIED: 'AI_CHAT_WALLET_ACCESS_DENIED',
  PENDING_ACTION_NOT_FOUND: 'AI_CHAT_PENDING_ACTION_NOT_FOUND',
  PENDING_ACTION_EXPIRED: 'AI_CHAT_PENDING_ACTION_EXPIRED',
  PENDING_ACTION_ALREADY_PROCESSED: 'AI_CHAT_PENDING_ACTION_ALREADY_PROCESSED',
  PENDING_ACTION_INVALID_ACCOUNT: 'AI_CHAT_PENDING_ACTION_INVALID_ACCOUNT',
  PENDING_ACTION_INVALID_CATEGORY: 'AI_CHAT_PENDING_ACTION_INVALID_CATEGORY',
  INVALID_AMOUNT: 'AI_CHAT_INVALID_AMOUNT',
  INVALID_DATE: 'AI_CHAT_INVALID_DATE',
  INVALID_NAME: 'AI_CHAT_INVALID_NAME',
  INVALID_CURSOR: 'AI_CHAT_INVALID_CURSOR',
  STT_FAILED: 'AI_CHAT_STT_FAILED',
  OCR_FAILED: 'AI_CHAT_OCR_FAILED',
  UNSUPPORTED_MEDIA: 'AI_CHAT_UNSUPPORTED_MEDIA',
  MEDIA_REQUIRED: 'AI_CHAT_MEDIA_REQUIRED',
  RATE_LIMITED: 'AI_CHAT_RATE_LIMITED',
  TRANSACTION_CREATE_FAILED: 'AI_CHAT_TRANSACTION_CREATE_FAILED',
} as const;

export const AI_CHAT_CONFIG = {
  PENDING_ACTION_TTL_MINUTES: 15,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_TRANSACTION_AMOUNT: 1_000_000_000, // 1 tỷ
  MAX_TRANSACTION_NAME_LENGTH: 200,
  DEFAULT_MASCOT_CODE: 'nora',
  MAX_AUDIO_BYTES: 10 * 1024 * 1024,
  MAX_IMAGE_BYTES: 8 * 1024 * 1024,
  ALLOWED_AUDIO_MIME: [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
    'audio/aac',
    'audio/wav',
    'audio/x-wav',
    'audio/webm',
    'audio/ogg',
    'audio/flac',
  ],
  ALLOWED_IMAGE_MIME: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
  ],
  RATE_LIMIT_PER_MINUTE: 30,
  RECENT_TRANSACTIONS_LIMIT: 10,
  PIE_MAX_SLICES: 6,
} as const;

/** 7 mascot theo cấp độ/tier tài chính (ai-flow.md). Nora là tông trung tính mặc định. */
export const MASCOT_CODES = [
  'ash',
  'penny',
  'sage',
  'nora',
  'jade',
  'ruby',
  'bellingham',
] as const;

/** Ngưỡng tin cậy mặc định (có thể ghi đè bằng biến môi trường, xem src/config/ai-model.config.ts). */
export const AI_DEFAULT_THRESHOLDS = {
  INTENT: 0.7,
  CATEGORY: 0.8,
  STT_MIN: 0.7,
  RULE_OVERRIDE: 0.9, // rule-based đủ chắc để "thắng" khi model confidence thấp
} as const;
