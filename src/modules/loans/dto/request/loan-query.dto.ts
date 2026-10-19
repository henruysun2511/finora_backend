import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LoanType } from '../../enums/loan-type.enum';
import { LoanStatus } from '../../enums/loan-status.enum';

export class LoanQueryDto {
  @ApiPropertyOptional({
    description: 'UUID của ví cần xem sổ nợ (mặc định ví cá nhân)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'walletId phải đúng định dạng UUID' })
  walletId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo loại khoản nợ',
    enum: LoanType,
  })
  @IsOptional()
  @IsEnum(LoanType, { message: 'Loại khoản nợ không hợp lệ' })
  type?: LoanType;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái nợ',
    enum: LoanStatus,
  })
  @IsOptional()
  @IsEnum(LoanStatus, { message: 'Trạng thái nợ không hợp lệ' })
  status?: LoanStatus;

  @ApiPropertyOptional({
    description: 'Tìm kiếm không dấu theo contactName',
    example: 'Anh Nam',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  search?: string;

  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng mục trên 1 trang (1-100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'limit tối đa là 100 mục' })
  limit?: number = 20;
}
