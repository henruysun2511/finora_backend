import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { RECURRING_ERROR_CODE } from '../recurring-transactions.constant';

export class RecurringTransactionNotFoundException extends AppError {
  constructor(id?: string) {
    super({
      code: RECURRING_ERROR_CODE.NOT_FOUND,
      message: 'Không tìm thấy quy tắc giao dịch định kỳ',
      statusCode: HttpStatus.NOT_FOUND,
      details: id ? { id } : undefined,
    });
  }
}

export class InvalidRecurrenceDateException extends AppError {
  constructor(message = 'Ngày kết thúc phải lớn hơn ngày bắt đầu') {
    super({
      code: RECURRING_ERROR_CODE.INVALID_DATE,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class RecurringRuleAlreadyPausedException extends AppError {
  constructor() {
    super({
      code: RECURRING_ERROR_CODE.ALREADY_PAUSED,
      message: 'Lịch định kỳ này đang ở trạng thái tạm dừng',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
