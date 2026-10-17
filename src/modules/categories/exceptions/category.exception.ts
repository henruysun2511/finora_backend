import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CATEGORY_ERROR_CODE } from '../categories.constant';

export class CategoryNotFoundException extends NotFoundException {
  constructor(idOrMessage?: string) {
    super({
      code: CATEGORY_ERROR_CODE.NOT_FOUND,
      message: idOrMessage
        ? idOrMessage.startsWith('Danh mục')
          ? idOrMessage
          : `Danh mục với ID '${idOrMessage}' không tồn tại`
        : 'Danh mục không tồn tại',
    });
  }
}

export class CategoryNameAlreadyExistsException extends BadRequestException {
  constructor(nameOrMessage?: string) {
    super({
      code: CATEGORY_ERROR_CODE.ALREADY_EXISTS,
      message: nameOrMessage
        ? nameOrMessage.includes('đã tồn tại')
          ? nameOrMessage
          : `Tên danh mục '${nameOrMessage}' đã tồn tại`
        : 'Tên danh mục đã tồn tại',
    });
  }
}

export class CategoryTypeConflictException extends BadRequestException {
  constructor(message?: string) {
    super({
      code: CATEGORY_ERROR_CODE.TYPE_CONFLICT,
      message: message || 'Loại danh mục không khớp hoặc không thể thay đổi',
    });
  }
}

export class CategoryInvalidParentException extends BadRequestException {
  constructor(message?: string) {
    super({
      code: CATEGORY_ERROR_CODE.INVALID_PARENT,
      message: message || 'Danh mục cha không hợp lệ',
    });
  }
}

export class CategoryHasTransactionsException extends BadRequestException {
  constructor(idOrMessage?: string) {
    super({
      code: CATEGORY_ERROR_CODE.HAS_TRANSACTIONS,
      message: 'Không thể xóa danh mục đã phát sinh giao dịch',
    });
  }
}

export class CategoryHasChildrenException extends BadRequestException {
  constructor(idOrMessage?: string) {
    super({
      code: CATEGORY_ERROR_CODE.HAS_CHILDREN,
      message: 'Không thể xóa danh mục đang chứa danh mục con',
    });
  }
}

export class CategoryHasBudgetsException extends BadRequestException {
  constructor(idOrMessage?: string) {
    super({
      code: CATEGORY_ERROR_CODE.HAS_BUDGETS,
      message: 'Không thể xóa danh mục đang gắn với ngân sách',
    });
  }
}

export class CategorySystemProtectedException extends BadRequestException {
  constructor(message?: string) {
    super({
      code: CATEGORY_ERROR_CODE.SYSTEM_PROTECTED,
      message: message || 'Không thể chỉnh sửa hoặc xóa danh mục mặc định của hệ thống',
    });
  }
}