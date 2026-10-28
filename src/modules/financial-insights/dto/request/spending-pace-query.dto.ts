import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class SpendingPaceQueryDto {
  @ApiPropertyOptional({
    description: 'Ngày mục tiêu kiểm tra (YYYY-MM-DD), mặc định là hôm nay',
    example: '2026-10-28',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Định dạng ngày phải là YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({
    description: 'ID của ví tài chính (tùy chọn khi gọi API tổng hợp)',
    example: 'b18b6241-1111-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID('4', { message: 'walletId phải là UUID hợp lệ' })
  walletId?: string;

  @ApiPropertyOptional({
    description: 'Kích hoạt AI Advisor sinh lời khuyên tài chính cá nhân hóa',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  useAi?: boolean = true;

  @ApiPropertyOptional({
    description: 'Bỏ qua cache và yêu cầu AI sinh lời khuyên mới ngay lập tức',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsBoolean()
  refreshAi?: boolean = false;
}
