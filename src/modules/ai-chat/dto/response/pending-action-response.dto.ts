// src/modules/ai-chat/dto/response/pending-action-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PendingActionStatus } from '../../enums/pending-action-status.enum';
import { ChatMessageResponseDto } from './chat-message-response.dto';

export class PendingActionResponseDto {
  @ApiProperty({ example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11' })
  id: string;

  @ApiProperty({ example: 'draft_transaction' })
  toolName: string;

  @ApiProperty({
    example: {
      type: 'EXPENSE',
      amount: 45000,
      name: 'Ăn sáng phở bò',
      categoryName: 'Ăn uống',
    },
  })
  toolInput: Record<string, any>;

  @ApiProperty({
    example: {
      title: 'Xác nhận ghi chép giao dịch',
      amountFormatted: '45.000 ₫',
    },
  })
  previewPayload: Record<string, any>;

  @ApiProperty({
    enum: PendingActionStatus,
    example: PendingActionStatus.PENDING,
  })
  status: PendingActionStatus;

  @ApiPropertyOptional({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  transactionId?: string | null;

  @ApiProperty({
    example: '2026-10-20T10:15:00.000Z',
    description: 'Thời điểm hết hạn (sau 15 phút)',
  })
  expiresAt: Date;

  @ApiProperty({ example: '2026-10-20T10:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({
    type: ChatMessageResponseDto,
    description:
      'Tin nhắn mascot sinh ra sau khi xử lý (xác nhận đã lưu + lời khuyên, hoặc xác nhận đã hủy).',
  })
  assistantMessage?: ChatMessageResponseDto | null;
}
