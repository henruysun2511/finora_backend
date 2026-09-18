import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: 'c8b9e67c-46df-5efd-cb2d-b5079ef83716' })
  id: string;

  @ApiProperty({ example: 'PRODUCTS_CREATE' })
  code: string;

  @ApiProperty({ example: 'Tạo sản phẩm mới' })
  name: string;

  @ApiPropertyOptional({ example: 'products' })
  resource?: string;

  @ApiPropertyOptional({ example: 'create' })
  action?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
