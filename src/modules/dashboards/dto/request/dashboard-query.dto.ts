import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: 'ID ví cụ thể (UUID), nếu để trống sẽ tính hợp nhất các ví sở hữu' })
  @IsOptional()
  @IsUUID('4', { message: 'walletId phải là định dạng UUID' })
  walletId?: string;
}