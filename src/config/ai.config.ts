import 'dotenv/config';

export const AiConfig = {
  PROVIDER: (process.env.AI_PROVIDER || 'gemini').toUpperCase(),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEFAULT_GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  DEFAULT_OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
} as const;
