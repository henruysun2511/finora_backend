import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { SPLIT_EXPENSE_ERROR_CODE } from '../split-expenses.constant';

export class SplitExpenseNotFoundException extends AppError {
  constructor(id: string) {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.NOT_FOUND,
      message: `Không tìm thấy phiên chia tiền với ID: ${id}`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { id },
    });
  }
}

export class SplitAlreadyExistsException extends AppError {
  constructor(transactionId: string) {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.ALREADY_EXISTS,
      message: 'Giao dịch này đã có một phiên chia tiền',
      statusCode: HttpStatus.CONFLICT,
      details: { transactionId },
    });
  }
}

export class InvalidSplitTotalAmountException extends AppError {
  constructor(expectedTotal: number, actualSum: number) {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.INVALID_TOTAL_AMOUNT,
      message: `Tổng số tiền phân bổ (${actualSum}) không khớp với số tiền của giao dịch (${expectedTotal})`,
      statusCode: HttpStatus.BAD_REQUEST,
      details: { expectedTotal, actualSum },
    });
  }
}

export class SplitConsensusNotReachedException extends AppError {
  constructor(pendingCount: number, proposedCount: number, rejectedCount: number) {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.CONSENSUS_NOT_REACHED,
      message: 'Chưa thể chốt phiên do chưa đạt 100% đồng thuận từ tất cả bạn bè',
      statusCode: HttpStatus.BAD_REQUEST,
      details: { pendingCount, proposedCount, rejectedCount },
    });
  }
}

export class NotSplitParticipantException extends AppError {
  constructor() {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.NOT_PARTICIPANT,
      message: 'Bạn không phải là người tham gia trong phiên chia tiền này',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class NotSplitOwnerException extends AppError {
  constructor() {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.NOT_OWNER,
      message: 'Chỉ chủ phiên chia tiền mới có quyền thực hiện thao tác này',
      statusCode: HttpStatus.FORBIDDEN,
    });
  }
}

export class SplitAlreadyConfirmedException extends AppError {
  constructor() {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.ALREADY_CONFIRMED,
      message: 'Phiên chia tiền đã được chốt, không thể chỉnh sửa hoặc thao tác thêm',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class SplitAlreadyCancelledException extends AppError {
  constructor() {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.ALREADY_CANCELLED,
      message: 'Phiên chia tiền đã bị hủy',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class CannotSplitWithSelfException extends AppError {
  constructor() {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.CANNOT_SPLIT_WITH_SELF,
      message: 'Không thể thêm chính mình vào danh sách bạn bè được chia tiền',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class NotFriendsException extends AppError {
  constructor(invalidUserIds: string[]) {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.NOT_FRIENDS,
      message: 'Chỉ có thể chia tiền với những người đã là bạn bè chính thức',
      statusCode: HttpStatus.BAD_REQUEST,
      details: { invalidUserIds },
    });
  }
}

export class InvalidSplitActionException extends AppError {
  constructor(message: string) {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.INVALID_ACTION,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvalidSplitTransactionTypeException extends AppError {
  constructor() {
    super({
      code: SPLIT_EXPENSE_ERROR_CODE.INVALID_TRANSACTION_TYPE,
      message: 'Tính năng chia tiền chỉ áp dụng cho giao dịch chi tiêu (EXPENSE)',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
