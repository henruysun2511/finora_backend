// src/modules/ai-chat/mapper/ai-chat.mapper.ts
import { Injectable } from '@nestjs/common';
import { ChatMessageResponseDto } from '../dto/response/chat-message-response.dto';
import { PendingActionResponseDto } from '../dto/response/pending-action-response.dto';
import { ChatMessage } from '../entities/chat-message.entity';
import { PendingAction } from '../entities/pending-action.entity';
import { PendingActionStatus } from '../enums/pending-action-status.enum';

@Injectable()
export class AiChatMapper {
  toMessageResponse(
    entity: ChatMessage,
    pending?: PendingAction | null,
  ): ChatMessageResponseDto {
    return {
      id: entity.id,
      role: entity.role,
      messageType: entity.messageType,
      textContent: entity.textContent,
      intent: entity.intent || null,
      mascot: entity.mascot || null,
      payloadJson: entity.payloadJson || null,
      pendingAction: pending ? this.toPendingSummary(pending) : null,
      createdAt: entity.createdAt,
    };
  }

  /** Gắn trạng thái hành động chờ vào các tin CONFIRMATION_PROMPT (map theo chatMessageId). */
  toMessageListResponse(
    entities: ChatMessage[],
    pendings: PendingAction[] = [],
  ): ChatMessageResponseDto[] {
    const byMessage = new Map(
      pendings
        .filter((p) => p.chatMessageId)
        .map((p) => [p.chatMessageId as string, p]),
    );
    return entities.map((e) =>
      this.toMessageResponse(e, byMessage.get(e.id) ?? null),
    );
  }

  toPendingActionResponse(
    entity: PendingAction,
    assistantMessage?: ChatMessageResponseDto | null,
  ): PendingActionResponseDto {
    return {
      id: entity.id,
      toolName: entity.toolName,
      toolInput: entity.toolInput,
      previewPayload: entity.previewPayload,
      status: this.effectiveStatus(entity),
      transactionId: entity.transactionId || null,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      assistantMessage: assistantMessage ?? null,
    };
  }

  private toPendingSummary(p: PendingAction) {
    return {
      id: p.id,
      status: this.effectiveStatus(p),
      expiresAt: p.expiresAt,
      transactionId: p.transactionId || null,
    };
  }

  /** PENDING nhưng đã quá hạn (scheduler chưa kịp quét) -> hiển thị EXPIRED. */
  private effectiveStatus(p: PendingAction): PendingActionStatus {
    return p.status === PendingActionStatus.PENDING &&
      new Date(p.expiresAt).getTime() < Date.now()
      ? PendingActionStatus.EXPIRED
      : p.status;
  }
}
