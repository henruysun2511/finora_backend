// src/modules/accounts/dto/request/update-account.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmpty,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AccountType } from '../../enums/account-type.enum';
import { SUPPORTED_CURRENCIES } from '../../accounts.constant';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class UpdateAccountDto {
  @ApiPropertyOptional({ example: 'Tiền mặt ví nhỏ' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên tài khoản không được để trống' })
  @MaxLength(150)
  @Transform(trim)
  name?: string;

  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType, { message: 'Loại tài khoản không hợp lệ' })
  type?: AccountType;

  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @Transform(upperTrim)
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Loại tiền tệ không hợp lệ' })
  currency?: string;

  @ApiPropertyOptional({ example: '6789' })
  @IsOptional()
  @Matches(/^[0-9]{4}$/, { message: 'accountNumberLast4 phải gồm đúng 4 chữ số' })
  accountNumberLast4?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  color?: string;

  // ---- Các trường bị cấm: client gửi lên sẽ bị báo lỗi validation ----
  @IsEmpty({ message: 'Không được cập nhật số dư qua API này, hãy dùng API điều chỉnh số dư' })
  balance?: unknown;

  @IsEmpty({ message: 'Không được cập nhật số dư qua API này, hãy dùng API điều chỉnh số dư' })
  initialBalance?: unknown;

  @IsEmpty({ message: 'Không được thay đổi ví của tài khoản' })
  walletId?: unknown;

  @IsEmpty({ message: 'Không được thay đổi chủ sở hữu tài khoản' })
  createdBy?: unknown;

  @IsEmpty({ message: 'Không được thay đổi chủ sở hữu tài khoản' })
  ownerId?: unknown;

  @IsEmpty({ message: 'Không được đổi trạng thái lưu trữ qua API này' })
  isArchived?: unknown;
}