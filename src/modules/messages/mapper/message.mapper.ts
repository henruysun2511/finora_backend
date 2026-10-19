import { Injectable } from '@nestjs/common';
import { DirectMessage } from '../entities/direct-message.entity';
import { MessageResponseDto, ReplySnippetDto, ReactionSummaryDto } from '../dto/response/message-response.dto';

@Injectable()
export class MessageMapper {
  toResponse(message: DirectMessage): MessageResponseDto {
    let replyToMessage: ReplySnippetDto | null = null;
    if (message.replyToMessage) {
      replyToMessage = {
        id: message.replyToMessage.id,
        content: message.replyToMessage.content,
        senderId: message.replyToMessage.senderId,
      };
    }

    const reactions: ReactionSummaryDto[] = (message.reactions ?? []).map((r) => ({
      emoji: r.emoji,
      userId: r.userId,
    }));

    return {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      replyToMessage,
      relatedTransactionId: message.relatedTransactionId ?? null,
      isRead: message.isRead,
      reactions,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
