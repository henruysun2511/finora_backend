import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { TransactionType } from '../../../../common/enums/transaction-type.enum';
import { TransactionVisibility } from '../../../../common/enums/transaction-visibility.enum';
import { TransactionSource } from '../../enums/transaction-source.enum';
import { PhotoType } from '../../enums/photo-type.enum';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'UUID của tài khoản tài chính',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsUUID('4', { message: 'accountId phải là định dạng UUID v4' })
  accountId: string;

  @ApiProperty({
    description: 'UUID của danh mục thu/chi',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID('4', { message: 'categoryId phải là định dạng UUID v4' })
  categoryId: string;

  @ApiPropertyOptional({
    description: 'UUID của hóa đơn OCR đã quét (nếu có)',
    example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
  })
  @IsOptional()
  @IsUUID('4', { message: 'receiptId phải là định dạng UUID v4' })
  receiptId?: string;

  @ApiProperty({
    enum: TransactionType,
    description: 'Loại giao dịch: EXPENSE (Chi tiêu) hoặc INCOME (Thu nhập)',
    example: TransactionType.EXPENSE,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TransactionType, {
    message: 'type phải là EXPENSE hoặc INCOME',
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Số tiền giao dịch (phải lớn hơn 0, tối đa 2 chữ số thập phân)',
    example: 150000,
    minimum: 0.01,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount phải là số hợp lệ với tối đa 2 số thập phân' })
  @Min(0.01, { message: 'amount phải lớn hơn 0' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Tên giao dịch (nếu không cung cấp, hệ thống tự lấy theo tên danh mục hoặc ghi chú)',
    example: 'Ăn trưa bún bò',
  })
  @IsOptional()
  @IsString({ message: 'name phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'name không được vượt quá 200 ký tự' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm phát sinh giao dịch (ISO string). Mặc định là thời gian hiện tại.',
    example: '2026-10-18T12:30:00.000Z',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  transactionDate?: Date;

  @ApiPropertyOptional({
    description: 'Ghi chú chi tiết cho giao dịch',
    example: 'Ăn cùng đồng nghiệp phòng ban',
  })
  @IsOptional()
  @IsString({ message: 'note phải là chuỗi ký tự' })
  note?: string;

  @ApiPropertyOptional({
    enum: TransactionSource,
    description: 'Nguồn phát sinh giao dịch. Mặc định là MANUAL.',
    example: TransactionSource.MANUAL,
    default: TransactionSource.MANUAL,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TransactionSource, { message: 'source không hợp lệ' })
  source?: TransactionSource = TransactionSource.MANUAL;

  @ApiPropertyOptional({
    enum: TransactionVisibility,
    description: 'Quyền hiển thị trong ví chia sẻ: PRIVATE hoặc FRIENDS. Mặc định PRIVATE.',
    example: TransactionVisibility.PRIVATE,
    default: TransactionVisibility.PRIVATE,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(TransactionVisibility, { message: 'visibility không hợp lệ' })
  visibility?: TransactionVisibility = TransactionVisibility.PRIVATE;

  @ApiPropertyOptional({
    description: 'Ẩn số tiền giao dịch với các thành viên khác trong ví chia sẻ',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'amountHidden phải là boolean' })
  amountHidden?: boolean = false;

  @ApiPropertyOptional({
    description: 'Loại trừ giao dịch khỏi các báo cáo tổng hợp',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'excludeFromReport phải là boolean' })
  excludeFromReport?: boolean = false;

  @ApiPropertyOptional({
    description: 'Tên địa điểm diễn ra giao dịch',
    example: 'Quán ăn Cô Ba',
  })
  @IsOptional()
  @IsString({ message: 'locationName phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'locationName không được vượt quá 255 ký tự' })
  locationName?: string;

  @ApiPropertyOptional({
    description: 'Vĩ độ vị trí (Latitude)',
    example: 10.776889,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'latitude phải là số' })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ vị trí (Longitude)',
    example: 106.700806,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'longitude phải là số' })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'URL ảnh hóa đơn hoặc hình ảnh đính kèm giao dịch',
    example: 'https://res.cloudinary.com/finora/image/upload/v1234/receipt1.jpg',
  })
  @IsOptional()
  @IsString({ message: 'photoUrl phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'photoUrl không được vượt quá 500 ký tự' })
  photoUrl?: string;

  @ApiPropertyOptional({
    enum: PhotoType,
    description: 'Phân loại ảnh: RECEIPT hoặc MOMENT. Mặc định là RECEIPT.',
    example: PhotoType.RECEIPT,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(PhotoType, { message: 'photoType không hợp lệ' })
  photoType?: PhotoType;
}
