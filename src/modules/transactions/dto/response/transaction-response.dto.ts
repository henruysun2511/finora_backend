import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';
import { TransactionVisibility } from '../../../../common/enums/transaction-visibility.enum';
import { TransactionSource } from '../../enums/transaction-source.enum';
import { TransactionStatus } from '../../enums/transaction-status.enum';
import { PhotoType } from '../../enums/photo-type.enum';
import { ReceiptResponseDto } from './receipt-response.dto';

export class TransactionResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  accountId: string;

  @ApiPropertyOptional({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' })
  receiptId?: string | null;

  @ApiPropertyOptional({ type: () => ReceiptResponseDto })
  receipt?: ReceiptResponseDto | null;

  @ApiPropertyOptional({ example: 'Tài khoản chính VCB' })
  accountName?: string;

  @ApiProperty({ example: 'u-12345678-abcd-ef01-2345-6789abcdef01' })
  createdBy: string;

  @ApiProperty({ example: 'cat-12345678-abcd-ef01-2345-6789abcdef01' })
  categoryId: string;

  @ApiPropertyOptional({ example: 'Ăn uống' })
  categoryName?: string;

  @ApiPropertyOptional({ example: 'utensils' })
  categoryIcon?: string;

  @ApiPropertyOptional({ example: '#FF5722' })
  categoryColor?: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  type: TransactionType;

  @ApiProperty({ example: 150000 })
  amount: number;

  @ApiProperty({ example: 'VND' })
  currency: string;

  @ApiProperty({ example: 'Ăn trưa bún bò' })
  name: string;

  @ApiPropertyOptional({ example: 'Ăn cùng đồng nghiệp' })
  note?: string | null;

  @ApiProperty({ enum: TransactionSource, example: TransactionSource.MANUAL })
  source: TransactionSource;

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.CONFIRMED })
  status: TransactionStatus;

  @ApiProperty({ enum: TransactionVisibility, example: TransactionVisibility.PRIVATE })
  visibility: TransactionVisibility;

  @ApiProperty({ example: false })
  amountHidden: boolean;

  @ApiProperty({ example: false })
  excludeFromReport: boolean;

  @ApiPropertyOptional({ example: 'Quán ăn Cô Ba' })
  locationName?: string | null;

  @ApiPropertyOptional({ example: 10.776889 })
  latitude?: number | null;

  @ApiPropertyOptional({ example: 106.700806 })
  longitude?: number | null;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/finora/image/upload/v1234/receipt1.jpg',
  })
  photoUrl?: string | null;

  @ApiPropertyOptional({
    enum: PhotoType,
    example: PhotoType.RECEIPT,
  })
  photoType?: PhotoType | null;

  @ApiPropertyOptional({
    description: 'Số dư tài khoản ngay sau khi thực hiện giao dịch',
    example: 850000,
  })
  balanceAfter?: number;

  @ApiProperty({ example: '2026-10-18T12:30:00.000Z' })
  transactionDate: Date;

  @ApiProperty({ example: '2026-10-18T12:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-18T12:30:00.000Z' })
  updatedAt: Date;
}
