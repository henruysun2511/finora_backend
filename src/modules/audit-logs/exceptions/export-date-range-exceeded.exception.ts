import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { AUDIT_LOG_ERROR_CODE } from '../audit-logs.constant';

export class ExportDateRangeExceededException extends AppError {
  constructor(days?: number) {
    super({
      code: AUDIT_LOG_ERROR_CODE.EXPORT_DATE_RANGE_EXCEEDED,
      message: 'Khoảng thời gian xuất dữ liệu tối đa là 90 ngày',
      statusCode: HttpStatus.BAD_REQUEST,
      details: days ? { days, maxDays: 90 } : undefined,
    });
  }
}
