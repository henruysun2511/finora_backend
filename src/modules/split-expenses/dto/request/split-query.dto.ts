import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SplitStatus } from '../../enums/split-status.enum';

export class SplitQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @ApiPropertyOptional({
    enum: SplitStatus,
    description: 'Lọc theo trạng thái phiên chia (pending, all_accepted, confirmed, cancelled)',
  })
  @IsOptional()
  @IsEnum(SplitStatus, { message: 'status không hợp lệ' })
  status?: SplitStatus;

  @ApiPropertyOptional({
    enum: ['owner', 'participant', 'all'],
    description: 'Lọc theo vai trò: owner (tôi là chủ), participant (tôi là bạn tham gia), all (tất cả)',
    default: 'all',
  })
  @IsOptional()
  @IsIn(['owner', 'participant', 'all'], {
    message: 'role phải là owner, participant hoặc all',
  })
  role?: 'owner' | 'participant' | 'all' = 'all';
}
