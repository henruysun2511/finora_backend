import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { TransactionVisibility } from '../../../../common/enums/transaction-visibility.enum';

export class UpdateFeedPostDto {
  @ApiPropertyOptional({
    enum: TransactionVisibility,
    example: TransactionVisibility.FRIENDS,
    description: 'FRIENDS: chia sẻ lên Bảng tin; PRIVATE: gỡ khỏi Bảng tin',
  })
  @IsOptional()
  @IsEnum(TransactionVisibility, { message: 'visibility không hợp lệ (PRIVATE hoặc FRIENDS)' })
  visibility?: TransactionVisibility;

  @ApiPropertyOptional({ example: true, description: 'Ẩn / hiện số tiền với bạn bè' })
  @IsOptional()
  @IsBoolean({ message: 'amountHidden phải là boolean' })
  amountHidden?: boolean;

  @ApiPropertyOptional({ example: 'Cà phê sáng cùng hội bạn thân', description: 'Caption bài đăng' })
  @IsOptional()
  @IsString({ message: 'note phải là chuỗi ký tự' })
  note?: string;
}