// src/modules/settings/dto/request/setup-pin.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SetupPinDto {
  @ApiProperty({
    description: 'Mã PIN bảo mật gồm 4 đến 6 chữ số',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã PIN không được để trống' })
  @IsString({ message: 'Mã PIN phải là chuỗi ký tự số' })
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải bao gồm từ 4 đến 6 chữ số' })
  pin: string;

  @ApiProperty({
    description: 'Xác nhận lại mã PIN bảo mật',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Xác nhận mã PIN không được để trống' })
  @IsString({ message: 'Xác nhận mã PIN phải là chuỗi ký tự số' })
  confirmPin: string;
}
