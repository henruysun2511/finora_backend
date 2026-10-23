import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EntityTimelineItemDto {
  @ApiProperty({ example: 'b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'UPDATE' })
  action: string;

  @ApiPropertyOptional({ example: 'Hoàng Văn Minh' })
  actorName?: string;

  @ApiPropertyOptional({
    example: 'Thay đổi số tiền từ 200.000₫ sang 500.000₫',
  })
  description?: string;

  @ApiProperty({ example: '2026-10-18T10:15:30.000Z' })
  createdAt: Date;
}

export class EntityTimelineResponseDto {
  @ApiProperty({ example: 'TRANSACTION' })
  entityType: string;

  @ApiProperty({ example: 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a' })
  entityId: string;

  @ApiProperty({ type: [EntityTimelineItemDto] })
  timeline: EntityTimelineItemDto[];
}
