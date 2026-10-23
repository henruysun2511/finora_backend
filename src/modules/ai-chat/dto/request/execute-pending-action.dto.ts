// src/modules/ai-chat/dto/request/execute-pending-action.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AI_CHAT_CONFIG } from '../../constants';

export enum PendingActionDecision {
  CONFIRM = 'CONFIRM',
  REJECT = 'REJECT',
}

export class EditTransactionDraftDto {
  @ApiPropertyOptional({
    example: 'Phở bò tái nạm',
    description: 'Tên giao dịch',
  })
  @IsOptional()
  @IsString()
  @MaxLength(AI_CHAT_CONFIG.MAX_TRANSACTION_NAME_LENGTH)
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
    description: 'ID danh mục',
  })
  @IsOptional()
  @IsUUID(undefined, { message: 'categoryId phải là UUID hợp lệ' })
  categoryId?: string;

  @ApiPropertyOptional({
    example: '2026-10-20',
    description: 'Ngày giao dịch dạng YYYY-MM-DD (giờ Việt Nam)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date phải có dạng YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({
    example: 'Ăn cùng đồng nghiệp',
    description: 'Ghi chú thêm',
  })
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
    description: 'CONFIRM (xác nhận lưu) hoặc REJECT (hủy bỏ)',
  })
  @IsNotEmpty({ message: 'action không được để trống' })
  @IsEnum(PendingActionDecision, {
    message: 'action phải là CONFIRM hoặc REJECT',
  })
  action: PendingActionDecision;

  @ApiPropertyOptional({
    type: EditTransactionDraftDto,
    description: 'Dữ liệu người dùng chỉnh sửa/bổ sung trước khi lưu',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EditTransactionDraftDto)
  editedData?: EditTransactionDraftDto;
}
