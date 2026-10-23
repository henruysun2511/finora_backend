// src/modules/settings/dto/request/disable-app-lock.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DisableAppLockDto {
  @ApiProperty({
    description: 'Mã PIN hiện tại để xác thực trước khi tắt khóa ứng dụng',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã PIN không được để trống' })
  @IsString({ message: 'Mã PIN phải là chuỗi ký tự số' })
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải bao gồm từ 4 đến 6 chữ số' })
  pin: string;
}
