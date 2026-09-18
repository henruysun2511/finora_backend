import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ProductStatus } from '../../products.constant';

export class CreateProductDto {
  @ApiProperty({ example: 'Bàn phím cơ không dây Finora Pro' })
  @IsString()
  @MinLength(2, { message: 'Tên sản phẩm tối thiểu 2 ký tự' })
  @MaxLength(200, { message: 'Tên sản phẩm tối đa 200 ký tự' })
  name: string;

  @ApiProperty({ example: 'KB-FINORA-PRO-01' })
  @IsString()
  @MinLength(2, { message: 'Mã SKU tối thiểu 2 ký tự' })
  @MaxLength(100, { message: 'Mã SKU tối đa 100 ký tự' })
  sku: string;

  @ApiPropertyOptional({
    example: 'Bàn phím cơ Bluetooth 3 chế độ kết nối, switch linear',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1450000, minimum: 0 })
  @IsNumber({}, { message: 'Giá sản phẩm phải là số hợp lệ' })
  @Min(0, { message: 'Giá sản phẩm không được âm' })
  price: number;

  @ApiPropertyOptional({ example: 50, default: 0, minimum: 0 })
  @IsOptional()
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Số lượng tồn kho không được âm' })
  stock?: number = 0;

  @ApiPropertyOptional({ example: 'Phụ kiện máy tính', default: 'General' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string = 'General';

  @ApiPropertyOptional({
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
    example: ProductStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ProductStatus, { message: 'Trạng thái không hợp lệ' })
  status?: ProductStatus = ProductStatus.ACTIVE;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean = true;
}
