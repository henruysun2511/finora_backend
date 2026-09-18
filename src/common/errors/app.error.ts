import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppErrorPayload {
  code: string;
  message: string;
  statusCode: HttpStatus;
  details?: Record<string, unknown>;
}

/**
 * Base exception cho toàn dự án Finora.
 * Tất cả business exception đều kế thừa class này.
 */
export class AppError extends HttpException {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(payload: AppErrorPayload, customMessage?: string) {
    super(
      {
        success: false,
        statusCode: payload.statusCode,
        code: payload.code,
        message: customMessage ?? payload.message,
        timestamp: new Date().toISOString(),
      },
      payload.statusCode,
    );
    this.code = payload.code;
    this.details = payload.details;
  }
}

// Mã lỗi chuẩn hệ thống (dùng chung toàn dự án)
export const ErrorCodes = {
  INTERNAL:              { code: 'INTERNAL_ERROR',         message: 'Lỗi hệ thống nội bộ',                   statusCode: HttpStatus.INTERNAL_SERVER_ERROR },
  VALIDATION:            { code: 'VALIDATION_ERROR',       message: 'Dữ liệu không hợp lệ',                  statusCode: HttpStatus.BAD_REQUEST           },
  NOT_FOUND:             { code: 'NOT_FOUND',              message: 'Không tìm thấy dữ liệu',                statusCode: HttpStatus.NOT_FOUND             },
  UNAUTHORIZED:          { code: 'UNAUTHORIZED',           message: 'Chưa xác thực danh tính',               statusCode: HttpStatus.UNAUTHORIZED          },
  FORBIDDEN:             { code: 'FORBIDDEN',              message: 'Không có quyền thực hiện thao tác',     statusCode: HttpStatus.FORBIDDEN             },
  CONFLICT:              { code: 'CONFLICT',               message: 'Dữ liệu bị xung đột hoặc đã tồn tại',   statusCode: HttpStatus.CONFLICT              },

  // Lỗi Database phổ biến
  DUPLICATE_VALUE:       { code: 'DUPLICATE_VALUE',        message: 'Dữ liệu đã tồn tại trong hệ thống',     statusCode: HttpStatus.CONFLICT              },
  FOREIGN_KEY_VIOLATION: { code: 'FOREIGN_KEY_VIOLATION',  message: 'Dữ liệu liên quan không tồn tại',       statusCode: HttpStatus.BAD_REQUEST           },
} as const;

// Helper thuận tiện ném lỗi 404 cho entity
export const notFound = (entity: string) => new AppError(
  { ...ErrorCodes.NOT_FOUND, message: `Không tìm thấy ${entity}` },
);
