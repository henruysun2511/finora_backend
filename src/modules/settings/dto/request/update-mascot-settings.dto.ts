// src/modules/settings/dto/request/update-mascot-settings.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { MascotTone } from '../../../mascots/enums/mascot-tone.enum';
import { MascotSensitivity } from '../../../mascots/enums/mascot-sensitivity.enum';

export class UpdateMascotSettingsDto {
  @ApiPropertyOptional({
    description: 'Bật/tắt hiển thị linh vật trên toàn bộ giao diện',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showMascot?: boolean;

  @ApiPropertyOptional({
    enum: MascotTone,
    description: 'Phong cách/giọng điệu phản hồi của linh vật (GENTLE, BALANCED, ROAST)',
    example: MascotTone.BALANCED,
  })
  @IsOptional()
  @IsEnum(MascotTone)
  mascotTone?: MascotTone;

  @ApiPropertyOptional({
    enum: MascotSensitivity,
    description: 'Mức độ nhạy / tần suất cảnh báo của linh vật (ALL, ANOMALIES_ONLY, SILENT)',
    example: MascotSensitivity.ANOMALIES_ONLY,
  })
  @IsOptional()
  @IsEnum(MascotSensitivity)
  mascotSensitivity?: MascotSensitivity;
}
