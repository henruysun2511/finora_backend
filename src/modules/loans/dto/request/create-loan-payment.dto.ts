import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateLoanPaymentDto {
  @ApiProperty({
    description: 'UUID tài khoản dùng để thanh toán/nhận tiền',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID('4', { message: 'accountId phải đúng định dạng UUID' })
  @IsNotEmpty({ message: 'accountId không được để trống' })
  accountId: string;

  @ApiProperty({
    description: 'Số tiền thanh toán đợt này (> 0)',
    example: 2000000,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount phải là số' })
  @IsPositive({ message: 'Số tiền thanh toán phải lớn hơn 0' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Ngày thanh toán (ISO 8601 string)',
    example: '2026-10-15T10:00:00.000Z',
  })
  @IsOptional()
  paymentDate?: string | Date;

  @ApiPropertyOptional({
    description: 'Cờ tự động cộng/trừ số dư tài khoản thanh toán',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  affectsBalance?: boolean = true;

  @ApiPropertyOptional({
    description: 'Ghi chú cho đợt thanh toán này',
    example: 'Trả đợt 2',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  note?: string;
}
