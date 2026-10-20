// src/modules/settings/dto/request/update-ai-settings.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiProvider } from '../../enums/ai-provider.enum';

export class UpdateAiSettingsDto {
  @ApiPropertyOptional({
    enum: AiProvider,
    description: 'Nhà cung cấp mô hình AI (GEMINI, OPENAI)',
    example: AiProvider.GEMINI,
  })
  @IsOptional()
  @IsEnum(AiProvider)
  provider?: AiProvider;

  @ApiPropertyOptional({
    description: 'Tên model AI muốn sử dụng (ví dụ: gemini-1.5-flash, gpt-4o-mini). Bỏ trống để dùng model mặc định của hệ thống.',
    example: 'gemini-1.5-flash',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({
    description: 'API Key cá nhân (BYOK). Gửi chuỗi rỗng "" hoặc null nếu muốn hủy và quay lại dùng API Key của hệ thống.',
    example: 'AIzaSyD-custom-api-key-here',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  apiKey?: string;
}
