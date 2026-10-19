import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { LOAN_ERROR_CODE } from '../loans.constant';

export class LoanNotFoundException extends AppError {
  constructor(id?: string) {
    super({
      code: LOAN_ERROR_CODE.NOT_FOUND,
      message: id
        ? `Không tìm thấy khoản vay/nợ với mã "${id}"`
        : 'Không tìm thấy khoản vay/nợ',
      statusCode: HttpStatus.NOT_FOUND,
      details: id ? { id } : undefined,
    });
  }
}

export class LoanAlreadySettledException extends AppError {
  constructor(message?: string) {
    super({
      code: LOAN_ERROR_CODE.ALREADY_SETTLED,
      message: message ?? 'Khoản nợ này đã được tất toán toàn bộ',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class PaymentAmountExceedsRemainingException extends AppError {
  constructor(paymentAmount: number, remainingAmount: number) {
    super({
      code: LOAN_ERROR_CODE.PAYMENT_EXCEEDS_REMAINING,
      message: 'Số tiền thanh toán vượt quá số dư nợ còn lại',
      statusCode: HttpStatus.BAD_REQUEST,
      details: { paymentAmount, remainingAmount },
    });
  }
}

export class CannotDeleteLoanWithPaymentsException extends AppError {
  constructor() {
    super({
      code: LOAN_ERROR_CODE.CANNOT_DELETE_WITH_PAYMENTS,
      message: 'Không thể xóa khoản nợ đã phát sinh lịch sử thanh toán',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class CounterpartyNotAppUserException extends AppError {
  constructor(message?: string) {
    super({
      code: LOAN_ERROR_CODE.COUNTERPARTY_NOT_APP_USER,
      message:
        message ??
        'Khoản nợ này không liên kết với người dùng FINORA nào để gửi thông báo',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class ReminderRateLimitException extends AppError {
  constructor(hoursRemaining?: number) {
    super({
      code: LOAN_ERROR_CODE.REMINDER_RATE_LIMIT,
      message: 'Bạn chỉ có thể gửi nhắc nợ mỗi 6 tiếng một lần',
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      details:
        hoursRemaining !== undefined ? { hoursRemaining } : undefined,
    });
  }
}

export class AccountInsufficientBalanceException extends AppError {
  constructor(currentBalance?: number, requiredAmount?: number) {
    super({
      code: LOAN_ERROR_CODE.ACCOUNT_INSUFFICIENT_BALANCE,
      message: 'Số dư tài khoản không đủ để thực hiện thanh toán',
      statusCode: HttpStatus.BAD_REQUEST,
      details:
        currentBalance !== undefined && requiredAmount !== undefined
          ? { currentBalance, requiredAmount }
          : undefined,
    });
  }
}

export class WalletAccessDeniedException extends AppError {
  constructor(walletId?: string) {
    super({
      code: LOAN_ERROR_CODE.WALLET_ACCESS_DENIED,
      message: 'Bạn không có quyền truy cập vào ví này',
      statusCode: HttpStatus.FORBIDDEN,
      details: walletId ? { walletId } : undefined,
    });
  }
}

export class NotCounterpartyUserException extends AppError {
  constructor() {
    super({
      code: LOAN_ERROR_CODE.NOT_COUNTERPARTY_USER,
      message: 'Bạn không phải là người được liên kết trong khoản nợ này',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class CannotChangeLoanTypeException extends AppError {
  constructor() {
    super({
      code: LOAN_ERROR_CODE.CANNOT_CHANGE_TYPE,
      message: 'Không được phép thay đổi loại khoản nợ',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class CannotEditSettledLoanException extends AppError {
  constructor() {
    super({
      code: LOAN_ERROR_CODE.CANNOT_EDIT_SETTLED_LOAN,
      message: 'Khoản nợ này đã được tất toán toàn bộ, không thể chỉnh sửa',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvalidDueDateException extends AppError {
  constructor(message?: string) {
    super({
      code: LOAN_ERROR_CODE.INVALID_DUE_DATE,
      message: message ?? 'Ngày đến hạn phải lớn hơn hoặc bằng ngày vay',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
