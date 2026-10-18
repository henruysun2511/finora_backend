import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { NotificationType } from '../../enums/notification-type.enum';

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (mặc định: 1)', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mục trên một trang (mặc định: 20)', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái đã đọc: true (đã đọc), false (chưa đọc)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: 'Lọc theo loại thông báo',
    example: NotificationType.BUDGET_WARNING,
  })
  @IsOptional()
  @IsEnum(NotificationType, { message: 'type không hợp lệ' })
  type?: NotificationType;
}
