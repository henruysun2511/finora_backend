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
  Length,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LoanType } from '../../enums/loan-type.enum';
import { LoanInterestPeriod } from '../../enums/loan-interest-period.enum';

export class CreateLoanDto {
  @ApiProperty({
    description: 'UUID của ví chứa khoản nợ',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID('4', { message: 'walletId phải đúng định dạng UUID' })
  @IsNotEmpty({ message: 'walletId không được để trống' })
  walletId: string;

  @ApiProperty({
    description: 'UUID của tài khoản liên kết',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID('4', { message: 'accountId phải đúng định dạng UUID' })
  @IsNotEmpty({ message: 'accountId không được để trống' })
  accountId: string;

  @ApiProperty({
    description:
      'Loại khoản nợ (LENT: cho vay, BORROWED: đi vay, INSTALLMENT: trả góp)',
    enum: LoanType,
    example: LoanType.LENT,
  })
  @IsEnum(LoanType, { message: 'type phải là LENT, BORROWED hoặc INSTALLMENT' })
  @IsNotEmpty({ message: 'Loại khoản nợ không được để trống' })
  type: LoanType;

  @ApiProperty({
    description: 'Tên người vay / người cho vay / ngân hàng',
    example: 'Anh Minh Đồng Nghiệp',
  })
  @IsString({ message: 'contactName phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên đối tác không được để trống' })
  @MaxLength(150, { message: 'Tên đối tác không được vượt quá 150 ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  contactName: string;

  @ApiPropertyOptional({
    description: 'Thông tin liên hệ (SĐT, email, chi nhánh)',
    example: '0912345678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  contactInfo?: string;

  @ApiPropertyOptional({
    description: 'UUID tài khoản bạn bè trên FINORA (nếu có liên kết)',
    example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  })
  @IsOptional()
  @IsUUID('4', { message: 'counterpartyUserId phải đúng định dạng UUID' })
  counterpartyUserId?: string;

  @ApiProperty({
    description: 'Số tiền vay gốc ban đầu (> 0)',
    example: 5000000,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'principalAmount phải là số' })
  @IsPositive({ message: 'principalAmount phải là số dương lớn hơn 0' })
  principalAmount: number;

  @ApiPropertyOptional({
    description: 'Đơn vị tiền tệ',
    example: 'VND',
    default: 'VND',
  })
  @IsOptional()
  @Length(3, 10)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  currency?: string = 'VND';

  @ApiPropertyOptional({
    description: 'Ngày phát sinh khoản nợ (ISO 8601 string)',
    example: '2026-10-18T10:00:00.000Z',
  })
  @IsOptional()
  loanDate?: string | Date;

  @ApiPropertyOptional({
    description: 'Ngày đến hạn trả nợ (ISO 8601 string)',
    example: '2026-11-18T10:00:00.000Z',
  })
  @IsOptional()
  dueDate?: string | Date;

  @ApiPropertyOptional({
    description: 'Cờ tự động xuất/nhận tiền vào số dư tài khoản',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  affectsBalance?: boolean = true;

  @ApiPropertyOptional({
    description: 'Ghi chú cho khoản nợ',
    example: 'Cho vay tiền đóng tiền nhà trọ',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  note?: string;

  @ApiPropertyOptional({
    description: 'Có tính lãi hay không',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isInterestBearing?: boolean = false;

  @ApiPropertyOptional({
    description: 'Lãi suất (% / kỳ)',
    example: 5.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  interestRate?: number;

  @ApiPropertyOptional({
    description: 'Kỳ hạn tính lãi',
    enum: LoanInterestPeriod,
  })
  @IsOptional()
  @IsEnum(LoanInterestPeriod)
  interestPeriod?: LoanInterestPeriod;
}
