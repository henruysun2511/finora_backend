import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MASCOT_ERROR_CODE } from '../mascots.constant';

export class MascotNotFoundException extends NotFoundException {
  constructor(idOrTierName?: string) {
    super({
      code: MASCOT_ERROR_CODE.NOT_FOUND,
      message: idOrTierName
        ? `Linh vật '${idOrTierName}' không tồn tại trong hệ thống`
        : 'Linh vật không tồn tại trong hệ thống',
    });
  }
}

export class MascotTierNameAlreadyExistsException extends BadRequestException {
  constructor(tierName: string) {
    super({
      code: MASCOT_ERROR_CODE.ALREADY_EXISTS,
      message: `Mã định danh linh vật '${tierName}' đã tồn tại`,
    });
  }
}

export class MascotInvalidNetWorthRangeException extends BadRequestException {
  constructor(message?: string) {
    super({
      code: MASCOT_ERROR_CODE.INVALID_RANGE,
      message:
        message ||
        'Khoảng tài sản ròng không hợp lệ: minNetWorth phải nhỏ hơn maxNetWorth',
    });
  }
}

export class MascotCannotDeleteException extends BadRequestException {
  constructor(message: string) {
    super({
      code: MASCOT_ERROR_CODE.CANNOT_DELETE_LAST,
      message,
    });
  }
}
