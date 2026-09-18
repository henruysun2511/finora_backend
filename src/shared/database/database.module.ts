import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app.config';
import { DatabaseConfig } from '../../config/database.config';

/**
 * DatabaseModule — cấu hình TypeORM root kết nối PostgreSQL.
 * Tự động bật SSL cho các cloud postgres (như Neon) khi url yêu cầu ssl hoặc chứa neon.tech.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isSsl = DatabaseConfig.URL.includes('sslmode=require') || DatabaseConfig.URL.includes('neon.tech');
        return {
          type: 'postgres',
          url: DatabaseConfig.URL,
          ssl: isSsl ? { rejectUnauthorized: false } : false,
          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
          synchronize: false, // Tắt synchronize tự động để quản lý toàn bộ cấu trúc DB bằng migration thủ công
          logging: AppConfig.IS_DEV,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
