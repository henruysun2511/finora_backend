// src/modules/settings/dto/request/change-pin.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ChangePinDto {
  @ApiProperty({
    description: 'Mã PIN hiện tại',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã PIN cũ không được để trống' })
  @IsString({ message: 'Mã PIN cũ phải là chuỗi ký tự số' })
  oldPin: string;

  @ApiProperty({
    description: 'Mã PIN mới (4 đến 6 chữ số)',
    example: '654321',
  })
  @IsNotEmpty({ message: 'Mã PIN mới không được để trống' })
  @IsString({ message: 'Mã PIN mới phải là chuỗi ký tự số' })
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN mới phải bao gồm từ 4 đến 6 chữ số' })
  newPin: string;

  @ApiProperty({
    description: 'Xác nhận lại mã PIN mới',
    example: '654321',
  })
  @IsNotEmpty({ message: 'Xác nhận mã PIN mới không được để trống' })
  @IsString({ message: 'Xác nhận mã PIN mới phải là chuỗi ký tự số' })
  confirmNewPin: string;
}
