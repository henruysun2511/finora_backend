// src/modules/transfers/dto/request/convert-currency.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class ConvertCurrencyDto {
  @ApiProperty({ example: '8a3e9c1e-6f6d-4a54-9b3f-2d6a0f0e8c11', description: 'ID tài khoản nguồn' })
  @IsUUID(undefined, { message: 'fromAccountId không hợp lệ' })
  fromAccountId: string;

  @ApiProperty({ example: '9b4f0d2f-7a7e-5b65-0c4a-3e7b1a1f9d22', description: 'ID tài khoản đích' })
  @IsUUID(undefined, { message: 'toAccountId không hợp lệ' })
  toAccountId: string;

  @ApiProperty({ example: 100000, description: 'Số tiền chuyển cần tính toán quy đổi thử nghiệm' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount phải là số tối đa 2 chữ số thập phân' })
  @Min(0.01, { message: 'amount phải lớn hơn 0' })
  @Max(999_999_999_999.99, { message: 'amount vượt quá giới hạn tối đa' })
  amount: number;
}
