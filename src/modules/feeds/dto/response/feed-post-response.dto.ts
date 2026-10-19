import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReactionEmoji } from '../../../../common/enums/reaction-emoji.enum';
import { TransactionVisibility } from '../../../../common/enums/transaction-visibility.enum';
import { PhotoType } from '../../../transactions/enums/photo-type.enum';

export class FeedAuthorDto {
  @ApiProperty({ example: 'u-minh-uuid' })
  id: string;

  @ApiProperty({ example: 'Hoàng Văn Minh' })
  fullName: string;

  @ApiProperty({ example: 'hoangminh' })
  username: string;

  @ApiPropertyOptional({ example: 'https://cdn.finora.app/avatars/minh.jpg' })
  avatar?: string | null;
}

export class FeedCategoryDto {
  @ApiProperty({ example: 'cat-coffee-uuid' })
  id: string;

  @ApiProperty({ example: 'Cà phê & Đồ uống' })
  name: string;

  @ApiPropertyOptional({ example: 'coffee' })
  icon?: string | null;

  @ApiPropertyOptional({ example: '#8B5A2B' })
  color?: string | null;
}

export class FeedPostResponseDto {
  @ApiProperty({ example: 'tx-1234-uuid' })
  id: string;

  @ApiProperty({ type: FeedAuthorDto })
  author: FeedAuthorDto;

  @ApiProperty({ example: 'Cà phê sáng cuối tuần' })
  name: string;

  @ApiPropertyOptional({ type: FeedCategoryDto, nullable: true })
  category: FeedCategoryDto | null;

  @ApiProperty({
    nullable: true,
    example: null,
    description: 'null khi tác giả bật ẩn số tiền và người xem không phải tác giả',
  })
  amount: number | null;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ example: true })
  isAmountHidden: boolean;

  @ApiPropertyOptional({ example: 'Gặp lại mấy đứa bạn cấp 3 vui quá', nullable: true })
  note?: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.finora.app/moments/coffee_morning.jpg', nullable: true })
  photoUrl?: string | null;

  @ApiPropertyOptional({ enum: PhotoType, example: PhotoType.MOMENT, nullable: true })
  photoType?: PhotoType | null;

  @ApiPropertyOptional({ example: 'The Coffee House - Trần Duy Hưng', nullable: true })
  locationName?: string | null;

  @ApiProperty({ example: '2026-10-18T08:30:00.000Z' })
  transactionDate: Date;

  @ApiProperty({ example: 5 })
  reactionsCount: number;

  @ApiProperty({ enum: ReactionEmoji, isArray: true, example: [ReactionEmoji.LIKE, ReactionEmoji.LOVE] })
  topReactions: ReactionEmoji[];

  @ApiProperty({ enum: ReactionEmoji, nullable: true, example: ReactionEmoji.LOVE })
  myReaction: ReactionEmoji | null;
}

export class UpdateFeedPostResponseDto {
  @ApiProperty({ example: 'tx-1234-uuid' })
  id: string;

  @ApiProperty({ enum: TransactionVisibility, example: TransactionVisibility.FRIENDS })
  visibility: TransactionVisibility;

  @ApiProperty({ example: true })
  amountHidden: boolean;

  @ApiPropertyOptional({ example: 'Cà phê sáng cùng hội bạn thân (đã cập nhật caption)', nullable: true })
  note?: string | null;

  @ApiProperty({ example: '2026-10-18T18:35:00.000Z' })
  updatedAt: Date;
}