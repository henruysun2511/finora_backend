import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { CATEGORY_ERROR_CODE } from '../categories.constant';

export class CategoryNotFoundException extends AppError {
  constructor(id: string) {
    super({
      code: CATEGORY_ERROR_CODE.NOT_FOUND,
      message: `Không tìm thấy danh mục với mã "${id}"`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { id },
    });
  }
}

export class CategoryHasTransactionsException extends AppError {
  constructor(id: string) {
    super({
      code: CATEGORY_ERROR_CODE.HAS_TRANSACTIONS,
      message: `Không thể xóa danh mục "${id}" do đã có giao dịch phát sinh`,
      statusCode: HttpStatus.BAD_REQUEST,
      details: { id },
    });
  }
}

export class CategoryInvalidParentException extends AppError {
  constructor(message: string) {
    super({
      code: CATEGORY_ERROR_CODE.INVALID_PARENT,
      message,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}