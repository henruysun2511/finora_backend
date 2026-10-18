import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app.config';
import { DatabaseConfig } from '../../config/database.config';

/**
 * DatabaseModule — Cấu hình TypeORM root kết nối PostgreSQL.
 * Tự động bật SSL cho các cloud Postgres (Neon, Supabase) khi URL yêu cầu ssl hoặc chứa neon.tech / supabase.co.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isSsl =
          DatabaseConfig.URL.includes('sslmode=require') ||
          DatabaseConfig.URL.includes('neon.tech') ||
          DatabaseConfig.URL.includes('supabase.co');
        return {
          type: 'postgres',
          url: DatabaseConfig.URL,
          ssl: isSsl ? { rejectUnauthorized: false } : false,
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
          synchronize: false, // Quản lý cấu trúc DB bằng migration thủ công
          logging: AppConfig.IS_DEV,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
