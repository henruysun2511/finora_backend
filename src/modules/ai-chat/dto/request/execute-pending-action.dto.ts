// src/modules/ai-chat/dto/request/execute-pending-action.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AI_CHAT_CONFIG } from '../../ai-chat.constant';

export enum PendingActionDecision {
  CONFIRM = 'CONFIRM',
  REJECT = 'REJECT',
}

export class EditTransactionDraftDto {
  @ApiPropertyOptional({ example: 'Phở bò tái nạm', description: 'Tên giao dịch' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({ example: 45000, description: 'Số tiền giao dịch' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(AI_CHAT_CONFIG.MAX_TRANSACTION_AMOUNT)
  amount?: number;

  @ApiPropertyOptional({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'ID tài khoản thanh toán',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'accountId phải là UUID hợp lệ' })
  accountId?: string;

  @ApiPropertyOptional({
    example: '22222222-2222-2222-2222-222222222222',
    description: 'ID danh mục chi tiêu',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'categoryId phải là UUID hợp lệ' })
  categoryId?: string;

  @ApiPropertyOptional({ example: '2026-10-20T10:00:00.000Z', description: 'Ngày giao dịch' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ example: 'Ăn cùng đồng nghiệp', description: 'Ghi chú thêm' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  note?: string;
}

export class ExecutePendingActionDto {
  @ApiProperty({
    enum: PendingActionDecision,
    example: PendingActionDecision.CONFIRM,
    description: 'Quyết định của người dùng: CONFIRM (Xác nhận tạo) hoặc REJECT (Hủy bỏ)',
  })
  @IsNotEmpty({ message: 'action không được để trống' })
  @IsEnum(PendingActionDecision, { message: 'action phải là CONFIRM hoặc REJECT' })
  action: PendingActionDecision;

  @ApiPropertyOptional({
    type: EditTransactionDraftDto,
    description: 'Dữ liệu chỉnh sửa trước khi lưu (nếu người dùng bấm Sửa thay vì Xác nhận ngay)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EditTransactionDraftDto)
  editedData?: EditTransactionDraftDto;
}
