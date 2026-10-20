// src/modules/settings/dto/response/verify-pin-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyPinResponseDto {
  @ApiProperty({ example: true, description: 'Trạng thái mã PIN có hợp lệ hay không' })
  valid: boolean;

  @ApiProperty({ example: 'Xác thực mã PIN thành công', description: 'Thông báo kết quả' })
  message: string;

  @ApiPropertyOptional({
    example: 4,
    description: 'Số lần thử còn lại trước khi bị khóa tạm thời (nếu mã PIN sai)',
  })
  remainingAttempts?: number;
}
