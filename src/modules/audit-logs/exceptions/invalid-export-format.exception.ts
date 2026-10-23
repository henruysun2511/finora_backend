import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { AUDIT_LOG_ERROR_CODE } from '../audit-logs.constant';

export class InvalidExportFormatException extends AppError {
  constructor(format?: string) {
    super({
      code: AUDIT_LOG_ERROR_CODE.INVALID_EXPORT_FORMAT,
      message: 'Định dạng xuất file phải là csv hoặc xlsx',
      statusCode: HttpStatus.BAD_REQUEST,
      details: format ? { format, supportedFormats: ['csv', 'xlsx'] } : undefined,
    });
  }
}
