import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { AUDIT_LOG_ERROR_CODE } from '../audit-logs.constant';

export class AuditLogAccessDeniedException extends AppError {
  constructor(details?: Record<string, any>) {
    super({
      code: AUDIT_LOG_ERROR_CODE.ACCESS_DENIED,
      message: 'Bạn không có quyền xem nhật ký hoạt động này',
      statusCode: HttpStatus.FORBIDDEN,
      details,
    });
  }
}
