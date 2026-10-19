import { ApiProperty } from '@nestjs/swagger';

export class MySplitsSummaryResponseDto {
  @ApiProperty({
    description: 'Số lượng yêu cầu chia tiền đang chờ người dùng phản hồi',
    example: 3,
  })
  pendingRequestsCount: number;

  @ApiProperty({
    description: 'Tổng số tiền người khác đang nợ mình qua các phiên đã chốt (chưa thanh toán)',
    example: 450000,
  })
  totalOwedToMe: number;

  @ApiProperty({
    description: 'Tổng số tiền mình đang nợ người khác qua các phiên đã chốt (chưa thanh toán)',
    example: 120000,
  })
  totalIOwe: number;
}
