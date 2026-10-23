import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogDiffItemDto {
  @ApiProperty({ example: 'amount' })
  field: string;

  @ApiPropertyOptional({ example: 200000 })
  from: any;

  @ApiPropertyOptional({ example: 500000 })
  to: any;
}

export class AuditLogDetailResponseDto {
  @ApiProperty({ example: 'b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  userId?: string;

  @ApiPropertyOptional({ example: 'Hoàng Văn Minh' })
  userName?: string;

  @ApiProperty({ example: 'UPDATE' })
  action: string;

  @ApiProperty({ example: 'TRANSACTION' })
  entityType: string;

  @ApiPropertyOptional({ example: 'd8e9f0a1-b2c3-4d5e-6f7a-8b9c0d1e2f3a' })
  entityId?: string;

  @ApiPropertyOptional({ example: '14.232.208.55' })
  ipAddress?: string;

  @ApiPropertyOptional({
    example:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
  })
  userAgent?: string;

  @ApiPropertyOptional({
    example: { amount: 200000, categoryId: 'cat-01', note: 'Ăn trưa' },
  })
  oldValue?: Record<string, any>;

  @ApiPropertyOptional({
    example: { amount: 500000, categoryId: 'cat-01', note: 'Ăn trưa nhóm' },
  })
  newValue?: Record<string, any>;

  @ApiProperty({ type: [AuditLogDiffItemDto] })
  diff: AuditLogDiffItemDto[];

  @ApiProperty({ example: '2026-10-18T10:15:30.000Z' })
  createdAt: Date;
}
