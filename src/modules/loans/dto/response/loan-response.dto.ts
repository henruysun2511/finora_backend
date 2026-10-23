import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanType } from '../../enums/loan-type.enum';
import { LoanStatus } from '../../enums/loan-status.enum';

export class LoanResponseDto {
  @ApiProperty({
    description: 'UUID của khoản nợ',
    example: 'c1f7a0b3-6c84-4d89-9a6d-e4b52df39001',
  })
  id: string;

  @ApiProperty({
    description: 'Loại khoản nợ (LENT, BORROWED, INSTALLMENT)',
    enum: LoanType,
    example: LoanType.LENT,
  })
  type: LoanType;

  @ApiProperty({
    description: 'Tên người vay / người cho vay / ngân hàng',
    example: 'Anh Nam Đồng Nghiệp',
  })
  contactName: string;

  @ApiProperty({
    description: 'Số tiền nợ ban đầu',
    example: 10000000,
  })
  principalAmount: number;

  @ApiProperty({
    description: 'Số tiền nợ còn lại',
    example: 3000000,
  })
  remainingAmount: number;

  @ApiProperty({
    description: 'Số tiền đã trả (principalAmount - remainingAmount)',
    example: 7000000,
  })
  paidAmount: number;

  @ApiProperty({
    description: 'Tiến độ trả nợ (%) làm tròn 1 chữ số thập phân',
    example: 70.0,
  })
  progressPercentage: number;

  @ApiProperty({
    description: 'Đơn vị tiền tệ',
    example: 'VND',
  })
  currency: string;

  @ApiPropertyOptional({
    description: 'Ngày đến hạn (ISO 8601 string)',
    example: '2026-11-01T00:00:00.000Z',
    nullable: true,
  })
  dueDate?: string | null;

  @ApiProperty({
    description: 'Trạng thái khoản nợ (ACTIVE, SETTLED, OVERDUE)',
    enum: LoanStatus,
    example: LoanStatus.ACTIVE,
  })
  status: LoanStatus;
}
