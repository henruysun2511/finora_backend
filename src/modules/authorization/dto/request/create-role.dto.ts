import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'ADMIN',
    description: 'Mã định danh vai trò (nhập từ FE, viết hoa, không dấu)',
  })
  @IsString({ message: 'Mã vai trò phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã vai trò không được để trống' })
  code: string;

  @ApiProperty({
    example: 'Quản trị viên',
    description: 'Tên hiển thị của vai trò',
  })
  @IsString({ message: 'Tên vai trò phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  name: string;

  @ApiPropertyOptional({
    example: 'Toàn quyền quản trị hệ thống',
    description: 'Mô tả vai trò',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
