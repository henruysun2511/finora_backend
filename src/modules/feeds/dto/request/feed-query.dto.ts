import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { FEED_CONSTANTS } from '../../feed.constant';

export class FeedQueryDto {
  @ApiPropertyOptional({ description: 'Lọc riêng bài đăng của một người bạn cụ thể' })
  @IsOptional()
  @IsUUID(undefined, { message: 'friendId không hợp lệ' })
  friendId?: string;

  @ApiPropertyOptional({
    default: FEED_CONSTANTS.PAGINATION.DEFAULT_PAGE,
    minimum: 1,
    description: 'Trang hiện tại',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page tối thiểu là 1' })
  page: number = FEED_CONSTANTS.PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    default: FEED_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    minimum: 1,
    maximum: FEED_CONSTANTS.PAGINATION.MAX_LIMIT,
    description: 'Số bài đăng mỗi trang',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(FEED_CONSTANTS.PAGINATION.MAX_LIMIT, {
    message: `limit tối đa là ${FEED_CONSTANTS.PAGINATION.MAX_LIMIT}`,
  })
  limit: number = FEED_CONSTANTS.PAGINATION.DEFAULT_LIMIT;
}