import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';
import { validateEnv } from './config/validation.schema';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

import { CustomLogger } from './infrastructures/logger/logger.service';

async function bootstrap() {
  // ── Validate Biến Môi Trường ─────────────────────────────────────────────
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // ── Logger (Winston) ─────────────────────────────────────────────────────
  app.useLogger(app.get(CustomLogger));

  // ── Prefix & Versioning (/api/v1/...) ────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      // Trong môi trường dev, cho phép tất cả các cổng localhost / 127.0.0.1 / nip.io (Web dev, Flutter Web, Vite, etc.)
      if (
        AppConfig.IS_DEV &&
        /^https?:\/\/(localhost|127\.0\.0\.1|34\.21\.234\.192|.*\.nip\.io)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      if (AppConfig.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: AppConfig.CORS_CREDENTIALS,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
  });

  // ── Global Validation Pipes ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field lạ ngoài DTO
      forbidNonWhitelisted: true,
      transform: true, // Tự động chuyển đổi payload sang instance DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Filters & Interceptors ────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter(), new TypeOrmExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── Swagger Documentation (/docs) ────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Finora API Platform')
    .setDescription(
      'Finora RESTful API Service — NestJS + TypeORM + PostgreSQL',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = AppConfig.PORT;
  await app.listen(port);
  console.log(`🚀 Finora API is running on: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger documentation at: http://localhost:${port}/docs`);
}

bootstrap();
