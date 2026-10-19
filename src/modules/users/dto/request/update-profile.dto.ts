import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên hiển thị đầy đủ',
  })
  @IsOptional()
  @IsString({ message: 'Họ và tên phải là chuỗi' })
  @MaxLength(150, { message: 'Họ và tên tối đa 150 ký tự' })
  fullName?: string;

  @ApiPropertyOptional({
    example: '0987654321',
    description: 'Số điện thoại liên hệ',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi' })
  @MaxLength(30, { message: 'Số điện thoại tối đa 30 ký tự' })
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://avatar.iran.liara.run/public/boy',
    description: 'Đường dẫn ảnh đại diện (URL)',
  })
  @IsOptional()
  @IsString({ message: 'Avatar phải là chuỗi đường dẫn' })
  @MaxLength(500, { message: 'Đường dẫn ảnh đại diện tối đa 500 ký tự' })
  avatar?: string;
}
