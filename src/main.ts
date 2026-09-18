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

async function bootstrap() {
  // ── Validate Biến Môi Trường ─────────────────────────────────────────────
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // ── Prefix & Versioning (/api/v1/...) ────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: AppConfig.FRONTEND_URL,
    credentials: true,
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
