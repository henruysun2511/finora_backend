import 'dotenv/config';

/**
 * Cấu hình kết nối cơ sở dữ liệu PostgreSQL.
 * Hỗ trợ connection string URL (Neon, Supabase, Render, Local Postgres, ...).
 */
export const DatabaseConfig = {
  URL: process.env.DATABASE_URL ?? '',
} as const;
