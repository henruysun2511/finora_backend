// src/modules/settings/dto/request/update-notification-preferences.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Bật/tắt nhận thông báo đẩy qua Socket/Push Notification',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt nhận thông báo tổng kết qua Email',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt cảnh báo khi chi tiêu chạm ngưỡng ngân sách',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  budgetAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo nhắc nhở đến hạn trả nợ/vay',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  loanReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo khi thăng/tụt hạng linh vật tài sản',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  mascotEvolutionAlerts?: boolean;

  @ApiPropertyOptional({
    description: 'Bật/tắt thông báo tương tác bạn bè & chia tiền nhóm',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  friendActivityAlerts?: boolean;
}
