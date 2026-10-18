// src/modules/transfers/exceptions/transfer.exception.ts
import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { TRANSFER_ERROR_CODE } from '../transfers.constant';

export class TransferNotFoundException extends AppError {
  constructor(id: string) {
    super({
      code: TRANSFER_ERROR_CODE.NOT_FOUND,
      message: `Không tìm thấy giao dịch chuyển tiền với mã "${id}"`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { id },
    });
  }
}

export class TransferAccessDeniedException extends AppError {
  constructor(id?: string) {
    super({
      code: TRANSFER_ERROR_CODE.ACCESS_DENIED,
      message: 'Bạn không có quyền truy cập vào giao dịch chuyển tiền này',
      statusCode: HttpStatus.FORBIDDEN,
      details: { id },
    });
  }
}

export class TransferSameAccountException extends AppError {
  constructor() {
    super({
      code: TRANSFER_ERROR_CODE.SAME_ACCOUNT,
      message: 'Tài khoản nguồn và tài khoản đích không được trùng nhau',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class TransferInsufficientBalanceException extends AppError {
  constructor(currentBalance: number, requiredAmount: number) {
    super({
      code: TRANSFER_ERROR_CODE.INSUFFICIENT_BALANCE,
      message: 'Số dư tài khoản nguồn không đủ để thực hiện chuyển tiền',
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      details: { currentBalance, requiredAmount },
    });
  }
}
