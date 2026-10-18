import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

export class TransactionQueryDto {
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

  @ApiPropertyOptional({ description: 'Lọc theo ID tài khoản' })
  @IsOptional()
  @IsUUID(undefined, { message: 'accountId không hợp lệ' })
  accountId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID danh mục' })
  @IsOptional()
  @IsUUID(undefined, { message: 'categoryId không hợp lệ' })
  categoryId?: string;

  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Lọc theo loại giao dịch (EXPENSE / INCOME)',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Từ ngày (ISO Date)' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate phải là định dạng ISO date' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Đến ngày (ISO Date)' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate phải là định dạng ISO date' })
  endDate?: string;
}
