import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown>;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exRes = exception.getResponse();

      if (typeof exRes === 'object' && exRes !== null && 'code' in exRes) {
        body = exRes as Record<string, unknown>;
      } else if (typeof exRes === 'object' && exRes !== null) {
        const rawRes = exRes as Record<string, unknown>;
        const rawMessage = rawRes.message;

        if (Array.isArray(rawMessage)) {
          // Lỗi Validation từ ValidationPipe (Class-Validator)
          body = {
            success: false,
            statusCode,
            code: 'VALIDATION_ERROR',
            message: 'Dữ liệu không hợp lệ',
            errors: rawMessage,
            timestamp: new Date().toISOString(),
          };
        } else {
          body = {
            success: false,
            statusCode,
            code:
              typeof rawRes.error === 'string'
                ? rawRes.error.toUpperCase().replace(/\s+/g, '_')
                : 'HTTP_EXCEPTION',
            message: typeof rawMessage === 'string' ? rawMessage : 'Error',
            timestamp: new Date().toISOString(),
          };
        }
      } else {
        body = {
          success: false,
          statusCode,
          code: 'HTTP_EXCEPTION',
          message: typeof exRes === 'string' ? exRes : 'Error',
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      this.logger.error(
        `Unhandled exception: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      body = {
        success: false,
        statusCode,
        code: 'INTERNAL_ERROR',
        message: 'Lỗi hệ thống, vui lòng thử lại sau',
        timestamp: new Date().toISOString(),
      };
    }

    this.logger.warn(
      `[${request.method}] ${request.url} → ${statusCode} ${body['code'] ?? ''}`,
    );

    response.status(statusCode).json({
      path: request.url,
      ...body,
    });
  }
}
