import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum PendingRequestType {
  RECEIVED = 'received',
  SENT = 'sent',
}

export class PendingRequestQueryDto {
  @ApiPropertyOptional({
    enum: PendingRequestType,
    default: PendingRequestType.RECEIVED,
    description: 'Loại lời mời: received (nhận được - mặc định) hoặc sent (đã gửi đi)',
  })
  @IsOptional()
  @IsEnum(PendingRequestType, {
    message: 'type phải là received hoặc sent',
  })
  type?: PendingRequestType = PendingRequestType.RECEIVED;
}
