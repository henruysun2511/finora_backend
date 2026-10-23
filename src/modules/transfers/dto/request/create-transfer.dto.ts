// src/modules/transfers/dto/request/create-transfer.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
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

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTransferDto {
  @ApiProperty({ example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11', description: 'ID tài khoản nguồn' })
  @IsUUID(undefined, { message: 'fromAccountId không hợp lệ' })
  fromAccountId: string;

  @ApiProperty({ example: '9b4f0d2f-7a7e-5b65-0c4a-3e7b1a1f9d22', description: 'ID tài khoản đích' })
  @IsUUID(undefined, { message: 'toAccountId không hợp lệ' })
  toAccountId: string;

  @ApiProperty({ example: 100000, description: 'Số tiền chuyển (tính theo tiền tệ của tài khoản nguồn)' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount phải là số tối đa 2 chữ số thập phân' })
  @Min(0.01, { message: 'Số tiền chuyển phải lớn hơn 0' })
  @Max(999_999_999_999.99, { message: 'Số tiền chuyển vượt quá giới hạn cho phép' })
  amount: number;

  @ApiPropertyOptional({ example: 0, default: 0, description: 'Phí giao dịch chuyển tiền nếu có' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'fee phải là số tối đa 2 chữ số thập phân' })
  @Min(0, { message: 'Phí giao dịch không được âm' })
  @Max(999_999_999.99, { message: 'Phí giao dịch vượt quá giới hạn' })
  fee?: number = 0;

  @ApiPropertyOptional({
    example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11',
    description: 'ID tài khoản trích tiền phí (mặc định lấy theo fromAccountId nếu bỏ trống)',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'feeAccountId không hợp lệ' })
  feeAccountId?: string;

  @ApiPropertyOptional({ example: 'Chuyển tiền mua sắm', description: 'Ghi chú giao dịch' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú tối đa 500 ký tự' })
  @Transform(trim)
  note?: string;

  @ApiPropertyOptional({ example: '2026-10-18T10:00:00Z', description: 'Ngày giao dịch (mặc định hiện tại)' })
  @IsOptional()
  @IsDateString({}, { message: 'transferDate phải là định dạng ISO date string' })
  transferDate?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Mã PIN bảo mật (bắt buộc nếu người dùng đã bật yêu cầu mã PIN khi giao dịch)',
  })
  @IsOptional()
  @IsString({ message: 'Mã PIN phải là chuỗi ký tự số' })
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải bao gồm từ 4 đến 6 chữ số' })
  pin?: string;
}
