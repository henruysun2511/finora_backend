import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'GROUPS_CREATE',
    description: 'Mã định danh quyền hạn (nhập từ FE, viết hoa, không dấu)',
  })
  @IsString({ message: 'Mã quyền hạn phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã quyền hạn không được để trống' })
  code: string;

  @ApiProperty({
    example: 'Tạo nhóm mới',
    description: 'Tên hiển thị của quyền hạn',
  })
  @IsString({ message: 'Tên quyền hạn phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên quyền hạn không được để trống' })
  name: string;

  @ApiPropertyOptional({
    example: 'groups',
    description: 'Tên tài nguyên / module quản lý',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    example: 'create',
    description: 'Hành động cụ thể (create, read, update, delete, approve...)',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    example: 'Cho phép người dùng tạo bản ghi sản phẩm mới',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
