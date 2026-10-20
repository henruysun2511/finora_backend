// src/modules/settings/dto/request/update-general-settings.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { Language } from '../../../users/enums/language.enum';
import { TransactionVisibility } from '../../../../common/enums/transaction-visibility.enum';
import { ThemeMode } from '../../enums/theme-mode.enum';

export class UpdateGeneralSettingsDto {
  @ApiPropertyOptional({
    description: 'Đơn vị tiền tệ mặc định (3 ký tự mã ISO 4217, ví dụ: VND, USD)',
    example: 'VND',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;

  @ApiPropertyOptional({
    enum: Language,
    description: 'Ngôn ngữ giao diện hệ thống (VI, EN)',
    example: Language.VI,
  })
  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @ApiPropertyOptional({
    enum: ThemeMode,
    description: 'Chế độ giao diện / theme màu (LIGHT, DARK, SYSTEM)',
    example: ThemeMode.SYSTEM,
  })
  @IsOptional()
  @IsEnum(ThemeMode)
  theme?: ThemeMode;

  @ApiPropertyOptional({
    enum: TransactionVisibility,
    description: 'Quyền riêng tư mặc định khi tạo giao dịch mới (PRIVATE, FRIENDS, PUBLIC)',
    example: TransactionVisibility.PRIVATE,
  })
  @IsOptional()
  @IsEnum(TransactionVisibility)
  defaultTransactionVisibility?: TransactionVisibility;

  @ApiPropertyOptional({
    description: 'Cờ mặc định ẩn số tiền trên giao diện để bảo vệ riêng tư',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  defaultAmountHidden?: boolean;
}
