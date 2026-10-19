import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateLoanDto {
  @ApiPropertyOptional({
    description: 'Tên người vay / người cho vay / ngân hàng',
    example: 'Anh Minh Đồng Nghiệp (Đã đổi SĐT)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Thông tin liên hệ (SĐT, email)',
    example: '0988776655',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  contactInfo?: string;

  @ApiPropertyOptional({
    description: 'Ngày đến hạn mới (ISO 8601 string)',
    example: '2026-12-01T00:00:00.000Z',
  })
  @IsOptional()
  dueDate?: string | Date;

  @ApiPropertyOptional({
    description: 'Ghi chú cập nhật',
    example: 'Minh xin gia hạn trả nợ sang đầu tháng 12',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  note?: string;

  @ApiPropertyOptional({
    description:
      'Số tiền gốc (chỉ được sửa khi khoản nợ CHƯA phát sinh thanh toán)',
    example: 6000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  principalAmount?: number;
}
