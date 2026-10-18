// src/modules/transfers/dto/request/transfer-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class TransferQueryDto {
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

  @ApiPropertyOptional({ description: 'Lọc theo ID tài khoản nguồn' })
  @IsOptional()
  @IsUUID(undefined, { message: 'fromAccountId không hợp lệ' })
  fromAccountId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID tài khoản đích' })
  @IsOptional()
  @IsUUID(undefined, { message: 'toAccountId không hợp lệ' })
  toAccountId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID tài khoản (nguồn HOẶC đích)' })
  @IsOptional()
  @IsUUID(undefined, { message: 'accountId không hợp lệ' })
  accountId?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Từ ngày' })
  @IsOptional()
  @IsDateString({}, { message: 'startDate phải là định dạng ISO date' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Đến ngày' })
  @IsOptional()
  @IsDateString({}, { message: 'endDate phải là định dạng ISO date' })
  endDate?: string;
}
