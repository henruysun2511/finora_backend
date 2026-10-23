import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParticipantStatus } from '../../enums/participant-status.enum';

export class SplitParticipantResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  splitId: string;

  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  userId: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  userName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  userAvatar?: string;

  @ApiProperty({ example: 100000 })
  assignedAmount: number;

  @ApiPropertyOptional({ example: 80000 })
  proposedAmount?: number;

  @ApiProperty({ enum: ParticipantStatus, example: ParticipantStatus.PENDING })
  status: ParticipantStatus;

  @ApiPropertyOptional({ example: 'Em chỉ ăn 1 bát phở thôi anh ơi' })
  note?: string;

  @ApiPropertyOptional({ example: 'd4e5f6a7-b8c9-0123-def1-234567890123' })
  loanId?: string;

  @ApiProperty({ example: false })
  isSettled: boolean;

  @ApiProperty({ example: '2026-10-19T07:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-19T07:00:00.000Z' })
  updatedAt: Date;
}
