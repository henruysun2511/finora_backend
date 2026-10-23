// src/modules/ai-chat/repositories/chat-message.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatMessageType } from '../enums/chat-message-type.enum';
import { ChatRole } from '../enums/chat-role.enum';
import { AiChatInvalidCursorException } from '../exceptions/ai-chat.exception';

@Injectable()
export class ChatMessageRepository {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repo: Repository<ChatMessage>,
  ) {}

  async createAndSave(data: {
    userId: string;
    walletId: string;
    role: ChatRole;
    messageType?: ChatMessageType;
    textContent: string;
    intent?: string | null;
    mascot?: string | null;
    payloadJson?: Record<string, any> | null;
  }): Promise<ChatMessage> {
    const entity = this.repo.create({
      userId: data.userId,
      walletId: data.walletId,
      role: data.role,
      messageType: data.messageType || ChatMessageType.TEXT,
      textContent: data.textContent,
      intent: data.intent || null,
      mascot: data.mascot || null,
      payloadJson: data.payloadJson || undefined,
    });
    return this.repo.save(entity);
  }

  /** Lịch sử mới nhất trước. Phân trang keyset theo (created_at, id) nên không mất/lặp tin cùng mili-giây. */
  async findByWalletPaged(
    walletId: string,
    userId: string,
    limit = 20,
    beforeId?: string,
  ): Promise<ChatMessage[]> {
    const qb = this.repo
      .createQueryBuilder('msg')
      .where('msg.wallet_id = :walletId', { walletId })
      .andWhere('msg.user_id = :userId', { userId })
      .orderBy('msg.created_at', 'DESC')
      .addOrderBy('msg.id', 'DESC')
      .limit(limit);

    if (beforeId) {
      const cursor = await this.repo.findOne({
        where: { id: beforeId, walletId, userId },
      });
      if (!cursor) throw new AiChatInvalidCursorException();
      qb.andWhere('(msg.created_at, msg.id) < (:cursorTime, :cursorId)', {
        cursorTime: cursor.createdAt,
        cursorId: cursor.id,
      });
    }
    return qb.getMany();
  }

  async deleteByWallet(walletId: string, userId: string): Promise<void> {
    await this.repo.delete({ walletId, userId });
  }
}
