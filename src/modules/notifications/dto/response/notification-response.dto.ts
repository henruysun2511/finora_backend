import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '../../enums/notification-type.enum';

export class NotificationResponseDto {
  @ApiProperty({ description: 'UUID thông báo', example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001' })
  id: string;

  @ApiProperty({ description: 'UUID người nhận', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  userId: string;

  @ApiProperty({ enum: NotificationType, description: 'Loại thông báo', example: NotificationType.BUDGET_ALERT })
  type: NotificationType;

  @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Ngân sách Ăn uống sắp chạm ngưỡng!' })
  title: string;

  @ApiProperty({ description: 'Nội dung chi tiết', example: 'Bạn đã chi 2.400.000₫ (80%) trên ngân sách 3.000.000₫.' })
  body: string;

  @ApiProperty({ description: 'Trạng thái đã đọc', example: false })
  isRead: boolean;

  @ApiPropertyOptional({ description: 'Loại đối tượng liên kết', example: 'BUDGET' })
  relatedEntityType?: string | null;

  @ApiPropertyOptional({ description: 'UUID đối tượng liên kết', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  relatedEntityId?: string | null;

  @ApiPropertyOptional({ description: 'Đường dẫn điều hướng (Deep link)', example: '/budgets/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  actionUrl?: string | null;

  @ApiProperty({ description: 'Thời gian tạo thông báo' })
  createdAt: Date;
}
