import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageReaction } from '../entities/message-reaction.entity';
import { ReactionEmoji } from '../../../common/enums/reaction-emoji.enum';

@Injectable()
export class MessageReactionRepository {
  constructor(
    @InjectRepository(MessageReaction)
    private readonly repo: Repository<MessageReaction>,
  ) {}

  /**
   * Thêm hoặc cập nhật reaction (Upsert).
   * Nếu user đã react trước đó, đổi emoji; nếu chưa, tạo mới.
   */
  async upsertReaction(
    messageId: string,
    userId: string,
    emoji: ReactionEmoji,
  ): Promise<MessageReaction> {
    const existing = await this.repo.findOne({
      where: { messageId, userId },
    });

    if (existing) {
      existing.emoji = emoji;
      return this.repo.save(existing);
    }

    const reaction = this.repo.create({ messageId, userId, emoji });
    return this.repo.save(reaction);
  }

  /**
   * Gỡ bỏ reaction của user trên tin nhắn.
   */
  async deleteReaction(messageId: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ messageId, userId });
    return (result.affected ?? 0) > 0;
  }
}
