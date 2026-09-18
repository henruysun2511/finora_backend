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

      if (typeof exRes === 'object' && 'code' in (exRes as object)) {
        body = exRes as Record<string, unknown>;
      } else {
        body = {
          success: false,
          statusCode,
          code: 'HTTP_EXCEPTION',
          message: typeof exRes === 'string' ? exRes : (exRes as any).message,
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      this.logger.error(`Unhandled exception: ${exception}`, (exception as any)?.stack);
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
