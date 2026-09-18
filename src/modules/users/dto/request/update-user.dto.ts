import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    example: 'NewPassword@123',
    description: 'Mật khẩu mới nếu muốn đổi',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
