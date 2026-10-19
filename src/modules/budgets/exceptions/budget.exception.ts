import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class BudgetNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Không tìm thấy ngân sách với ID: ${id}`);
  }
}

export class BudgetDuplicateException extends ConflictException {
  constructor() {
    super('Ngân sách cho danh mục và chu kỳ này đã tồn tại trong ví');
  }
}

export class InvalidBudgetCategoryException extends BadRequestException {
  constructor() {
    super('Ngân sách chỉ áp dụng cho danh mục chi tiêu');
  }
}

export class InvalidBudgetDateException extends BadRequestException {
  constructor() {
    super('startDate không hợp lệ');
  }
}
