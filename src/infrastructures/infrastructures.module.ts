import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtConfig } from '../config/jwt.config';
import { DatabaseModule } from './database/database.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MailerModule } from './mailer/mailer.module';
import { LoggerModule } from './logger/logger.module';
import { RedisModule } from './redis/redis.module';

/**
 * InfrastructuresModule — Module hạ tầng dùng chung toàn hệ thống (@Global).
 * Tự động cung cấp kết nối Cơ sở dữ liệu (PostgreSQL TypeORM), JWT (Global Token Service),
 * Cloudinary (Media storage), Mailer (Email SMTP), Redis (Cache & Token) và Logger (Winston)
 * cho toàn bộ ứng dụng FINORA.
 */
@Global()
@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: JwtConfig.SECRET,
      signOptions: { expiresIn: JwtConfig.EXPIRES_IN as any },
    }),
    CloudinaryModule,
    MailerModule,
    LoggerModule,
    RedisModule,
  ],
  exports: [
    DatabaseModule,
    JwtModule,
    CloudinaryModule,
    MailerModule,
    LoggerModule,
    RedisModule,
  ],
})
export class InfrastructuresModule {}
