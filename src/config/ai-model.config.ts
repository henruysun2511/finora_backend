import 'dotenv/config';

export interface AiModelConfig {
  /** URL gốc của dịch vụ model (FastAPI/HuggingFace: /intent, /category, /generate, /stt, /ocr). null = chỉ chạy rule-based. */
  baseUrl: string | null;
  apiKey: string | null;
  intentThreshold: number;
  categoryThreshold: number;
  sttMinConfidence: number;
  textGenEnabled: boolean;
  timeouts: {
    nlpMs: number;
    generateMs: number;
    sttMs: number;
    ocrMs: number;
  };
}

export const DEFAULT_AI_MODEL_CONFIG = {
  INTENT_THRESHOLD: 0.7,
  CATEGORY_THRESHOLD: 0.8,
  STT_MIN_CONFIDENCE: 0.7,
  TIMEOUT_NLP_MS: 3000,
  TIMEOUT_GENERATE_MS: 10000,
  TIMEOUT_STT_MS: 10000,
  TIMEOUT_OCR_MS: 15000,
} as const;

function parseNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Đọc cấu hình dịch vụ AI Model từ biến môi trường.
 * Đọc mỗi lần gọi để hỗ trợ ghi đè env trong test runner mà không phụ thuộc vòng đời ConfigModule.
 */
export function getAiModelConfig(): AiModelConfig {
  const url = (process.env.AI_MODEL_SERVICE_URL || '')
    .trim()
    .replace(/\/+$/, '');

  return {
    baseUrl: url || null,
    apiKey: (process.env.AI_MODEL_SERVICE_KEY || '').trim() || null,
    intentThreshold: parseNumber(
      'AI_INTENT_THRESHOLD',
      DEFAULT_AI_MODEL_CONFIG.INTENT_THRESHOLD,
    ),
    categoryThreshold: parseNumber(
      'AI_CATEGORY_THRESHOLD',
      DEFAULT_AI_MODEL_CONFIG.CATEGORY_THRESHOLD,
    ),
    sttMinConfidence: parseNumber(
      'AI_STT_MIN_CONFIDENCE',
      DEFAULT_AI_MODEL_CONFIG.STT_MIN_CONFIDENCE,
    ),
    textGenEnabled:
      (process.env.AI_TEXT_GEN_ENABLED || 'false').toLowerCase() === 'true',
    timeouts: {
      nlpMs: parseNumber(
        'AI_NLP_TIMEOUT_MS',
        DEFAULT_AI_MODEL_CONFIG.TIMEOUT_NLP_MS,
      ),
      generateMs: parseNumber(
        'AI_GENERATE_TIMEOUT_MS',
        DEFAULT_AI_MODEL_CONFIG.TIMEOUT_GENERATE_MS,
      ),
      sttMs: parseNumber(
        'AI_STT_TIMEOUT_MS',
        DEFAULT_AI_MODEL_CONFIG.TIMEOUT_STT_MS,
      ),
      ocrMs: parseNumber(
        'AI_OCR_TIMEOUT_MS',
        DEFAULT_AI_MODEL_CONFIG.TIMEOUT_OCR_MS,
      ),
    },
  };
}

export const getAiModelConfigFromEnv = getAiModelConfig;

