import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorCodes } from '../errors/app.error';

interface PgErrorMapping {
  statusCode: HttpStatus;
  code: string;
  message: string;
}

const PG_ERROR_MAP: Record<string, PgErrorMapping> = {
  '23505': { ...ErrorCodes.DUPLICATE_VALUE },
  '23503': { ...ErrorCodes.FOREIGN_KEY_VIOLATION },
  '23502': { ...ErrorCodes.VALIDATION, message: 'Dữ liệu không được bỏ trống' },
  '23514': {
    ...ErrorCodes.VALIDATION,
    message: 'Dữ liệu không hợp lệ theo ràng buộc',
  },
  '22P02': {
    ...ErrorCodes.VALIDATION,
    message: 'Giá trị dữ liệu không đúng định dạng',
  },
};

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const driverError = (
      exception as { driverError?: { code?: string; detail?: string } }
    ).driverError;
    const pgCode = driverError?.code;

    if (!pgCode || !PG_ERROR_MAP[pgCode]) {
      this.logger.error(
        `Unmapped DB error: ${exception.message}`,
        exception.stack,
      );
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCodes.INTERNAL.code,
        message: ErrorCodes.INTERNAL.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const mapping = PG_ERROR_MAP[pgCode];
    const rawDetail = driverError.detail ?? '';
    const fieldMatch = rawDetail.match(/Key \(([^)]+)\)/);

    this.logger.warn(`DB error ${pgCode}: ${rawDetail || exception.message}`);

    response.status(mapping.statusCode).json({
      success: false,
      statusCode: mapping.statusCode,
      code: mapping.code,
      message: fieldMatch
        ? `${mapping.message} (${fieldMatch[1]})`
        : mapping.message,
      details: fieldMatch ? { field: fieldMatch[1] } : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
