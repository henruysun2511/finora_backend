import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'rst_3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Mã token xác thực sau khi verify OTP thành công',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reset token không được để trống' })
  resetToken: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
  })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  newPassword: string;
}
