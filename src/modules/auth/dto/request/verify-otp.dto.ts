import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@finora.vn',
    description: 'Địa chỉ email nhận mã xác nhận OTP',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực 6 chữ số gửi qua email',
  })
  @Matches(/^\d{6}$/, { message: 'Mã xác thực OTP phải gồm đúng 6 chữ số' })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  otp: string;
}
