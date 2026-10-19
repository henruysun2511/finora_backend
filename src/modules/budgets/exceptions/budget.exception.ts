import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { BUDGET_ERROR_CODE } from '../budgets.constant';

export class BudgetNotFoundException extends AppError {
  constructor(id: string) {
    super({
      code: BUDGET_ERROR_CODE.NOT_FOUND,
      message: `Không tìm thấy ngân sách với ID: ${id}`,
      statusCode: HttpStatus.NOT_FOUND,
      details: { id },
    });
  }
}

export class BudgetDuplicateException extends AppError {
  constructor() {
    super({
      code: BUDGET_ERROR_CODE.DUPLICATE,
      message: 'Ngân sách cho danh mục và chu kỳ này đã tồn tại trong ví',
      statusCode: HttpStatus.CONFLICT,
    });
  }
}

export class InvalidBudgetCategoryException extends AppError {
  constructor() {
    super({
      code: BUDGET_ERROR_CODE.INVALID_CATEGORY,
      message: 'Ngân sách chỉ áp dụng cho danh mục chi tiêu',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}

export class InvalidBudgetDateException extends AppError {
  constructor() {
    super({
      code: BUDGET_ERROR_CODE.INVALID_DATE,
      message: 'startDate không hợp lệ',
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
