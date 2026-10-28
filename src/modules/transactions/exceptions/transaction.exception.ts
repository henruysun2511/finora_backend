import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TRANSACTION_ERROR_CODE } from '../transactions.constant';

export class TransactionNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      code: TRANSACTION_ERROR_CODE.NOT_FOUND,
      message: `Giao dịch với ID '${id}' không tồn tại`,
    });
  }
}

export class TransactionAccessDeniedException extends ForbiddenException {
  constructor(message = 'Bạn không có quyền thực hiện thao tác trên giao dịch này') {
    super({
      code: TRANSACTION_ERROR_CODE.ACCESS_DENIED,
      message,
    });
  }
}

export class ReceiptNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      code: 'RECEIPT_NOT_FOUND',
      message: `Hóa đơn với ID '${id}' không tồn tại`,
    });
  }
}

