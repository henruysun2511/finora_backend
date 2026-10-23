import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AUDIT_LOG_CONSTANTS } from '../../audit-logs.constant';

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID ví chung',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'walletId phải là UUID hợp lệ' })
  walletId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo loại đối tượng (TRANSACTION, ACCOUNT, WALLET_MEMBER...)',
    example: 'TRANSACTION',
  })
  @IsOptional()
  @IsString({ message: 'entityType phải là chuỗi ký tự' })
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo hành động (CREATE, UPDATE, DELETE, LOGIN...)',
    example: 'UPDATE',
  })
  @IsOptional()
  @IsString({ message: 'action phải là chuỗi ký tự' })
  action?: string;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu lọc (ISO 8601)',
    example: '2026-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate phải là định dạng ISO 8601' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc lọc (ISO 8601)',
    example: '2026-10-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'endDate phải là định dạng ISO 8601' })
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Số trang hiện tại',
    default: AUDIT_LOG_CONSTANTS.PAGINATION.DEFAULT_PAGE,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page tối thiểu là 1' })
  page: number = AUDIT_LOG_CONSTANTS.PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: 'Số bản ghi trên 1 trang',
    default: AUDIT_LOG_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu là 1' })
  @Max(AUDIT_LOG_CONSTANTS.PAGINATION.MAX_LIMIT, {
    message: `limit tối đa là ${AUDIT_LOG_CONSTANTS.PAGINATION.MAX_LIMIT}`,
  })
  limit: number = AUDIT_LOG_CONSTANTS.PAGINATION.DEFAULT_LIMIT;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
