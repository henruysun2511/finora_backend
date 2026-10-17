import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { WALLET_DEFAULTS } from '../../wallets.constant';

export class CreateWalletDto {
  @ApiProperty({
    example: 'Chi tiêu cá nhân',
    description: 'Tên ví tài chính',
  })
  @IsString({ message: 'Tên ví phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên ví không được để trống' })
  @MaxLength(100, { message: 'Tên ví tối đa 100 ký tự' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    example: '💼',
    description: 'Icon hoặc emoji đại diện cho ví',
  })
  @IsOptional()
  @IsString({ message: 'Icon phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Icon tối đa 255 ký tự' })
  icon?: string;

  @ApiPropertyOptional({
    example: 'Ví quản lý các chi tiêu sinh hoạt hàng ngày',
    description: 'Mô tả chi tiết mục đích của ví',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  description?: string;

  @ApiPropertyOptional({
    example: 'VND',
    default: WALLET_DEFAULTS.CURRENCY,
    description: 'Mã tiền tệ ISO (3 ký tự, ví dụ: VND, USD, SGD)',
  })
  @IsOptional()
  @IsString({ message: 'Mã tiền tệ phải là chuỗi ký tự' })
  @Length(3, 3, { message: 'Mã tiền tệ phải đúng 3 ký tự (ISO 4217)' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  defaultCurrency?: string = WALLET_DEFAULTS.CURRENCY;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Có cho phép chia sẻ ví với nhiều thành viên hay không',
  })
  @IsOptional()
  @IsBoolean({ message: 'Trường isShared phải là boolean' })
  isShared?: boolean = false;
}
