import { HttpStatus } from '@nestjs/common';
import { AppError } from '../../../common/errors/app.error';
import { PRODUCT_ERROR_CODE } from '../products.constant';

export class ProductSkuAlreadyExistsException extends AppError {
  constructor(sku: string) {
    super(
      {
        code: PRODUCT_ERROR_CODE.SKU_ALREADY_EXISTS,
        message: `Mã sản phẩm (SKU) "${sku}" đã tồn tại trên hệ thống`,
        statusCode: HttpStatus.CONFLICT,
        details: { sku },
      },
    );
  }
}

export class ProductNameAlreadyExistsException extends AppError {
  constructor(name: string) {
    super(
      {
        code: PRODUCT_ERROR_CODE.NAME_ALREADY_EXISTS,
        message: `Tên sản phẩm "${name}" đã tồn tại trên hệ thống`,
        statusCode: HttpStatus.CONFLICT,
        details: { name },
      },
    );
  }
}
