import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PRODUCTS_CONSTANTS, ProductStatus } from '../../products.constant';
import { SortOrder } from '../../../../common/enums/sort-order.enum';

export class ProductQueryDto {
  @ApiPropertyOptional({
    default: PRODUCTS_CONSTANTS.PAGINATION.DEFAULT_PAGE,
    minimum: 1,
    description: 'Trang hiện tại (bắt đầu từ 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PRODUCTS_CONSTANTS.PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: PRODUCTS_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    minimum: 1,
    maximum: PRODUCTS_CONSTANTS.PAGINATION.MAX_LIMIT,
    description: 'Số bản ghi trên mỗi trang',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PRODUCTS_CONSTANTS.PAGINATION.MAX_LIMIT)
  limit: number = PRODUCTS_CONSTANTS.PAGINATION.DEFAULT_LIMIT;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên, SKU hoặc mô tả',
    example: 'Finora',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo danh mục sản phẩm',
    example: 'Phụ kiện máy tính',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    enum: ProductStatus,
    description: 'Lọc theo trạng thái sản phẩm',
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo giá tối thiểu',
    minimum: 0,
    example: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo giá tối đa',
    minimum: 0,
    example: 5000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái còn hàng / mở bán',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: 'createdAt',
    default: 'createdAt',
    description: 'Trường sắp xếp (createdAt, price, name, stock, updatedAt)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
    description: 'Chiều sắp xếp (ASC hoặc DESC)',
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
