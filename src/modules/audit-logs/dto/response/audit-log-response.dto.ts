import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogItemDto {
  @ApiProperty({ example: 'b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  userId?: string;

  @ApiPropertyOptional({ example: 'Hoàng Văn Minh' })
  userName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.finora.app/avatars/minh.jpg' })
  userAvatar?: string;

  @ApiProperty({ example: 'UPDATE' })
  action: string;

  @ApiProperty({ example: 'TRANSACTION' })
  entityType: string;

  @ApiPropertyOptional({ example: 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a' })
  entityId?: string;

  @ApiPropertyOptional({
    example: 'Đã cập nhật số tiền giao dịch từ 200.000₫ thành 500.000₫',
  })
  summary?: string;

  @ApiPropertyOptional({ example: '14.232.208.55' })
  ipAddress?: string;

  @ApiProperty({ example: '2026-10-18T10:15:30.000Z' })
  createdAt: Date;
}
