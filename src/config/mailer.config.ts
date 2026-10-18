import 'dotenv/config';

export const MailerConfig = {
  HOST: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SECURE: process.env.SMTP_PORT === '465',
  USER: process.env.SMTP_USER ?? '',
  PASS: process.env.SMTP_PASS ?? '',
  FROM_NAME: process.env.SMTP_FROM_NAME ?? 'Finora',
  FROM_EMAIL: process.env.SMTP_FROM_EMAIL ?? 'support@finora.vn',
} as const;
