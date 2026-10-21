// src/modules/settings/dto/request/update-transaction-pin.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateTransactionPinDto {
  @ApiProperty({
    description: 'Trạng thái bật/tắt yêu cầu mã PIN khi giao dịch nhạy cảm (chuyển tiền, đổi số dư)',
    example: true,
  })
  @IsBoolean({ message: 'enabled phải là kiểu boolean' })
  enabled: boolean;

  @ApiProperty({
    description: 'Mã PIN bảo mật hiện tại để xác thực trước khi đổi cài đặt',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã PIN không được để trống' })
  @IsString({ message: 'Mã PIN phải là chuỗi ký tự số' })
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải bao gồm từ 4 đến 6 chữ số' })
  pin: string;
}
