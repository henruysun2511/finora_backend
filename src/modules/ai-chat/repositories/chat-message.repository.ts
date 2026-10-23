// src/modules/ai-chat/repositories/chat-message.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatRole } from '../enums/chat-role.enum';
import { ChatMessageType } from '../enums/chat-message-type.enum';

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
      payloadJson: data.payloadJson || null,
    });
    return this.repo.save(entity);
  }

  async findRecentContext(
    walletId: string,
    userId: string,
    limit = 10,
  ): Promise<ChatMessage[]> {
    const list = await this.repo.find({
      where: { walletId, userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    // Trả về theo thứ tự thời gian tăng dần để nạp vào prompt context
    return list.reverse();
  }

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
      .take(limit);

    if (beforeId) {
      const cursor = await this.repo.findOne({ where: { id: beforeId } });
      if (cursor) {
        qb.andWhere('msg.created_at < :cursorTime', { cursorTime: cursor.createdAt });
      }
    }

    const results = await qb.getMany();
    return results;
  }

  async deleteByWallet(walletId: string, userId: string): Promise<void> {
    await this.repo.delete({ walletId, userId });
  }
}
