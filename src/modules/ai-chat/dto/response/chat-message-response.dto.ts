// src/modules/ai-chat/dto/response/chat-message-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatMessageType } from '../../enums/chat-message-type.enum';
import { ChatRole } from '../../enums/chat-role.enum';
import { PendingActionStatus } from '../../enums/pending-action-status.enum';

export class PendingActionSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: PendingActionStatus }) status: PendingActionStatus;
  @ApiProperty() expiresAt: Date;
  @ApiPropertyOptional() transactionId?: string | null;
}

export class ChatMessageResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id: string;

  @ApiProperty({ enum: ChatRole, example: ChatRole.ASSISTANT })
  role: ChatRole;

  @ApiProperty({ enum: ChatMessageType, example: ChatMessageType.TEXT })
  messageType: ChatMessageType;

  @ApiProperty({
    example: 'Hôm nay bạn đã chi tiêu 450.000 ₫ qua 3 giao dịch.',
  })
  textContent: string;

  @ApiPropertyOptional({
    example: 'query_spending',
    description: 'Nhãn intent nhận diện được',
  })
  intent?: string | null;

  @ApiPropertyOptional({
    example: 'ruby',
    description: 'Mascot sinh câu trả lời',
  })
  mascot?: string | null;

  @ApiPropertyOptional({
    description:
      'Dữ liệu biểu đồ, stat card, danh sách giao dịch, confirmation prompt, gợi ý làm rõ...',
    example: {
      chartType: 'pie',
      data: [{ label: 'Ăn uống', value: 350000, percentage: 78 }],
    },
  })
  payloadJson?: Record<string, any> | null;

  @ApiPropertyOptional({
    type: PendingActionSummaryDto,
    description:
      'Chỉ có với CONFIRMATION_PROMPT: trạng thái hiện tại của hành động chờ (đã tự suy ra hết hạn).',
  })
  pendingAction?: PendingActionSummaryDto | null;

  @ApiProperty({ example: '2026-10-20T10:00:00.000Z' })
  createdAt: Date;
}
