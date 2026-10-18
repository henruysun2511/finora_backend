import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

export class DailyTransactionGridQueryDto {
  @ApiPropertyOptional({
    description: 'Tháng cần xem (1 - 12)',
    example: 10,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'month phải là số nguyên' })
  @Min(1, { message: 'month tối thiểu là 1' })
  @Max(12, { message: 'month tối đa là 12' })
  month?: number;

  @ApiPropertyOptional({
    description: 'Năm cần xem (ví dụ: 2026)',
    example: 2026,
    minimum: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'year phải là số nguyên' })
  @Min(2000, { message: 'year không hợp lệ' })
  year?: number;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu khoảng tùy chỉnh (ISO string YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'startDate phải có định dạng ISO 8601 (YYYY-MM-DD)' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc khoảng tùy chỉnh (ISO string YYYY-MM-DD)',
    example: '2026-10-31',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'endDate phải có định dạng ISO 8601 (YYYY-MM-DD)' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo UUID tài khoản cụ thể',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'accountId phải là UUID v4' })
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo UUID ví (lấy toàn bộ tài khoản trong ví)',
    example: 'e5f6a7b8-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
  })
  @IsOptional()
  @IsUUID('4', { message: 'walletId phải là UUID v4' })
  walletId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo UUID danh mục',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId phải là UUID v4' })
  categoryId?: string;

  @ApiPropertyOptional({
    enum: TransactionType,
    description: 'Lọc loại giao dịch (INCOME hoặc EXPENSE)',
    example: TransactionType.EXPENSE,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TransactionType, { message: 'type phải là EXPENSE hoặc INCOME' })
  type?: TransactionType;
}
