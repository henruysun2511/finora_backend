import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

export class RecurringTransactionQueryDto {
  @ApiPropertyOptional({ description: 'ID ví (nếu không truyền sẽ dùng ví cá nhân)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'walletId không hợp lệ' })
  walletId?: string;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType, { message: 'Loại giao dịch không hợp lệ' })
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái tạm dừng (true) hoặc hoạt động (false)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'isPaused phải là boolean' })
  isPaused?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}