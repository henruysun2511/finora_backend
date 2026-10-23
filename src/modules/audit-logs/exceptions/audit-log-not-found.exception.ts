import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { AUDIT_LOG_ERROR_CODE } from '../audit-logs.constant';

export class AuditLogNotFoundException extends AppError {
  constructor(id?: string) {
    super({
      code: AUDIT_LOG_ERROR_CODE.NOT_FOUND,
      message: 'Không tìm thấy bản ghi nhật ký hoạt động',
      statusCode: HttpStatus.NOT_FOUND,
      details: id ? { id } : undefined,
    });
  }
}
