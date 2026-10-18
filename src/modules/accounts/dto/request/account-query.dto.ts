// src/modules/accounts/dto/request/account-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AccountType } from '../../enums/account-type.enum';
import { SUPPORTED_CURRENCIES } from '../../accounts.constant';

export class AccountQueryDto {
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

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên tài khoản' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID(undefined, { message: 'walletId không hợp lệ' })
  walletId?: string;

  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType, { message: 'Loại tài khoản không hợp lệ' })
  type?: AccountType;

  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[], { message: 'Loại tiền tệ không hợp lệ' })
  currency?: string;

  @ApiPropertyOptional({ default: false, description: 'true = chỉ tài khoản đã lưu trữ' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'isArchived phải là true hoặc false' })
  isArchived: boolean = false;
}
