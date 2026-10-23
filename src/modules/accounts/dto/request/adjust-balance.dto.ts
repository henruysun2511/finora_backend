// src/modules/accounts/dto/request/adjust-balance.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BalanceDirection } from '../../../../modules/accounts/enums/balance-direction.enum';
import { MAX_MONEY_AMOUNT } from '../../accounts.constant';

export class AdjustBalanceDto {
  @ApiProperty({ enum: BalanceDirection, example: BalanceDirection.INCREASE })
  @IsEnum(BalanceDirection, { message: 'Chiều điều chỉnh phải là INCREASE hoặc DECREASE' })
  direction: BalanceDirection;

  @ApiProperty({ example: 50000, description: 'Giá trị tuyệt đối, luôn > 0' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Giá trị điều chỉnh tối đa 2 chữ số thập phân' })
  @Min(0.01, { message: 'Giá trị điều chỉnh phải lớn hơn 0' })
  @Max(MAX_MONEY_AMOUNT)
  amount: number;

  @ApiProperty({ example: 'Đối chiếu số dư thực tế với sao kê ngân hàng' })
  @IsString()
  @IsNotEmpty({ message: 'Lý do điều chỉnh không được để trống' })
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Mã PIN bảo mật (bắt buộc nếu người dùng đã bật yêu cầu mã PIN khi giao dịch)',
  })
  @IsOptional()
  @IsString({ message: 'Mã PIN phải là chuỗi ký tự số' })
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải bao gồm từ 4 đến 6 chữ số' })
  pin?: string;
}