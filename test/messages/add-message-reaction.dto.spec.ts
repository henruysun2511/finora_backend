import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddMessageReactionDto } from '../../src/modules/messages/dto/request/add-message-reaction.dto';
import { ReactionEmoji } from '../../src/common/enums/reaction-emoji.enum';

describe('AddMessageReactionDto', () => {
  it('accepts uppercase enum names and normalizes them to stored enum values', async () => {
    const dto = plainToInstance(AddMessageReactionDto, { emoji: 'LOVE' });

    expect(dto.emoji).toBe(ReactionEmoji.LOVE);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
