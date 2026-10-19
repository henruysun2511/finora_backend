import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SplitType } from '../../enums/split-type.enum';
import { SplitStatus } from '../../enums/split-status.enum';
import { SplitParticipantResponseDto } from './split-participant-response.dto';

export class SplitResponseDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  transactionId: string;

  @ApiProperty({ example: 'f1e2d3c4-b5a6-7890-abcd-ef1234567890' })
  walletId: string;

  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  createdById: string;

  @ApiPropertyOptional({ example: 'Tran Van Chu' })
  creatorName?: string;

  @ApiProperty({ example: 300000 })
  totalAmount: number;

  @ApiProperty({ enum: SplitType, example: SplitType.EQUAL })
  splitType: SplitType;

  @ApiProperty({ enum: SplitStatus, example: SplitStatus.PENDING })
  status: SplitStatus;

  @ApiProperty({ example: '2026-10-19T07:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-19T07:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: [SplitParticipantResponseDto] })
  participants: SplitParticipantResponseDto[];
}
