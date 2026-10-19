import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { RecurrencePeriod } from '../../enums/recurrence-period.enum';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';

export class CreateRecurringTransactionDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID(undefined, { message: 'walletId phải là dạng UUID' })
  @IsNotEmpty({ message: 'walletId không được để trống' })
  walletId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  @IsUUID(undefined, { message: 'accountId phải là dạng UUID' })
  @IsNotEmpty({ message: 'accountId không được để trống' })
  accountId: string;

  @ApiProperty({ example: 'c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f' })
  @IsUUID(undefined, { message: 'categoryId phải là dạng UUID' })
  @IsNotEmpty({ message: 'categoryId không được để trống' })
  categoryId: string;

  @ApiProperty({ example: 'Gói Netflix 4K' })
  @IsString()
  @IsNotEmpty({ message: 'Tên quy tắc định kỳ không được để trống' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType, { message: 'Loại giao dịch không hợp lệ' })
  type: TransactionType;

  @ApiProperty({ example: 260000 })
  @IsNumber({}, { message: 'Số tiền phải là một số' })
  @IsPositive({ message: 'Số tiền phải lớn hơn 0' })
  amount: number;

  @ApiPropertyOptional({ example: 'VND', default: 'VND' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  currency?: string;

  @ApiProperty({ enum: RecurrencePeriod, example: RecurrencePeriod.MONTHLY })
  @IsEnum(RecurrencePeriod, { message: 'Chu kỳ lặp không hợp lệ' })
  frequency: RecurrencePeriod;

  @ApiProperty({ example: '2026-10-25T00:00:00.000Z' })
  @IsDateString({}, { message: 'startDate phải là định dạng ISO date string' })
  startDate: string;

  @ApiPropertyOptional({ example: '2027-10-25T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString({}, { message: 'endDate phải là định dạng ISO date string' })
  endDate?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean({ message: 'executeImmediately phải là boolean' })
  executeImmediately?: boolean = false;
}