// src/modules/settings/dto/request/toggle-biometric.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleBiometricDto {
  @ApiProperty({
    description: 'Trạng thái bật/tắt xác thực sinh trắc học (vân tay / khuôn mặt)',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  enabled: boolean;
}
