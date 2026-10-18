// src/modules/accounts/dto/request/create-account.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AccountType } from '../../enums/account-type.enum';
import { MAX_MONEY_AMOUNT, SUPPORTED_CURRENCIES } from '../../accounts.constant';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateAccountDto {
  @ApiProperty({ example: '0b1c1a0e-6f6d-4a54-9b3f-2d6a0f0e8c11' })
  @IsUUID(undefined, { message: 'walletId không hợp lệ' })
  walletId: string;

  @ApiProperty({ example: 'Vietcombank' })
  @IsString()
  @IsNotEmpty({ message: 'Tên tài khoản không được để trống' })
  @MaxLength(150)
  @Transform(trim)
  name: string;

  @ApiProperty({ enum: AccountType, example: AccountType.BANK })
  @IsEnum(AccountType, { message: 'Loại tài khoản không hợp lệ' })
  type: AccountType;

  @ApiPropertyOptional({
    example: 'VND',
    enum: SUPPORTED_CURRENCIES,
    description:
      'Loại tiền tệ (mặc định lấy theo tiền tệ của ví nếu để trống). 1 Ví chỉ chứa các tài khoản cùng loại tiền tệ.',
  })
  @IsOptional()
  @Transform(upperTrim)
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Loại tiền tệ không hợp lệ' })
  currency?: string;

  @ApiPropertyOptional({ example: 1000000, default: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Số dư ban đầu tối đa 2 chữ số thập phân' })
  @Min(0, { message: 'Số dư ban đầu không được âm' })
  @Max(MAX_MONEY_AMOUNT)
  initialBalance?: number = 0;

  @ApiPropertyOptional({ example: '6789', description: '4 số cuối của số tài khoản/thẻ' })
  @IsOptional()
  @Matches(/^[0-9]{4}$/, { message: 'accountNumberLast4 phải gồm đúng 4 chữ số' })
  accountNumberLast4?: string;

  @ApiPropertyOptional({ example: 'bank' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string;

  @ApiPropertyOptional({ example: '#1E90FF' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  color?: string;
}