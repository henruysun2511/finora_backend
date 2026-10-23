import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AUDIT_LOG_CONSTANTS } from '../../audit-logs.constant';

export class ExportAuditLogDto {
  @ApiProperty({
    description: 'Định dạng xuất file (csv hoặc xlsx)',
    example: 'csv',
    enum: AUDIT_LOG_CONSTANTS.EXPORT.SUPPORTED_FORMATS,
  })
  @IsNotEmpty({ message: 'format không được để trống' })
  @IsString({ message: 'format phải là chuỗi ký tự' })
  @IsIn(AUDIT_LOG_CONSTANTS.EXPORT.SUPPORTED_FORMATS, {
    message: 'format phải là csv hoặc xlsx',
  })
  format: 'csv' | 'xlsx';

  @ApiProperty({
    description: 'Ngày bắt đầu khoảng xuất (ISO 8601)',
    example: '2026-10-01T00:00:00.000Z',
  })
  @IsNotEmpty({ message: 'startDate không được để trống' })
  @IsDateString({}, { message: 'startDate phải là định dạng ISO 8601' })
  startDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc khoảng xuất (ISO 8601)',
    example: '2026-10-31T23:59:59.999Z',
  })
  @IsNotEmpty({ message: 'endDate không được để trống' })
  @IsDateString({}, { message: 'endDate phải là định dạng ISO 8601' })
  endDate: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID ví chung cần xuất',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'walletId phải là UUID hợp lệ' })
  walletId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo loại đối tượng',
    example: 'TRANSACTION',
  })
  @IsOptional()
  @IsString({ message: 'entityType phải là chuỗi ký tự' })
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo hành động',
    example: 'UPDATE',
  })
  @IsOptional()
  @IsString({ message: 'action phải là chuỗi ký tự' })
  action?: string;
}
