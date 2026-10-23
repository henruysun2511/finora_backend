// src/modules/settings/dto/request/verify-pin.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyPinDto {
  @ApiProperty({
    description: 'Mã PIN bảo mật cần xác thực (4 đến 6 chữ số)',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã PIN không được để trống' })
  @IsString({ message: 'Mã PIN phải là chuỗi ký tự số' })
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải bao gồm từ 4 đến 6 chữ số' })
  pin: string;
}
