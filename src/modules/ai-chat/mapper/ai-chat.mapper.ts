// src/modules/ai-chat/mapper/ai-chat.mapper.ts
import { Injectable } from '@nestjs/common';
import { ChatMessage } from '../entities/chat-message.entity';
import { PendingAction } from '../entities/pending-action.entity';
import { ChatMessageResponseDto } from '../dto/response/chat-message-response.dto';
import { PendingActionResponseDto } from '../dto/response/pending-action-response.dto';

@Injectable()
export class AiChatMapper {
  toMessageResponse(entity: ChatMessage): ChatMessageResponseDto {
    return {
      id: entity.id,
      role: entity.role,
      messageType: entity.messageType,
      textContent: entity.textContent,
      intent: entity.intent || null,
      mascot: entity.mascot || null,
      payloadJson: entity.payloadJson || null,
      createdAt: entity.createdAt,
    };
  }

  toMessageListResponse(entities: ChatMessage[]): ChatMessageResponseDto[] {
    return entities.map((item) => this.toMessageResponse(item));
  }

  toPendingActionResponse(entity: PendingAction): PendingActionResponseDto {
    return {
      id: entity.id,
      toolName: entity.toolName,
      toolInput: entity.toolInput,
      previewPayload: entity.previewPayload,
      status: entity.status,
      transactionId: entity.transactionId || null,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
    };
  }
}
