// src/modules/settings/dto/response/user-settings-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language } from '../../../users/enums/language.enum';
import { TransactionVisibility } from '../../../../common/enums/transaction-visibility.enum';
import { MascotTone } from '../../../mascots/enums/mascot-tone.enum';
import { MascotSensitivity } from '../../../mascots/enums/mascot-sensitivity.enum';

export class UserSettingsResponseDto {
  @ApiProperty({ example: 'VND', description: 'Đơn vị tiền tệ mặc định' })
  defaultCurrency: string;

  @ApiProperty({ enum: Language, example: Language.VI, description: 'Ngôn ngữ giao diện' })
  language: Language;

  @ApiProperty({ example: false, description: 'Trạng thái khóa ứng dụng bằng mã PIN' })
  appLockEnabled: boolean;

  @ApiProperty({ example: false, description: 'Trạng thái đã thiết lập mã PIN hay chưa' })
  hasPin: boolean;

  @ApiProperty({ example: true, description: 'Cờ bật/tắt hiển thị linh vật' })
  showMascot: boolean;

  @ApiProperty({
    enum: MascotTone,
    example: MascotTone.BALANCED,
    description: 'Phong cách phản hồi của linh vật',
  })
  mascotTone: MascotTone;

  @ApiProperty({
    enum: MascotSensitivity,
    example: MascotSensitivity.ANOMALIES_ONLY,
    description: 'Mức độ nhạy cảnh báo của linh vật',
  })
  mascotSensitivity: MascotSensitivity;

  @ApiPropertyOptional({
    example: '11111111-1111-1111-1111-111111111111',
    description: 'ID của mốc linh vật hiện tại',
  })
  currentMascotTierId?: string | null;

  @ApiProperty({
    enum: TransactionVisibility,
    example: TransactionVisibility.PRIVATE,
    description: 'Quyền riêng tư mặc định của giao dịch',
  })
  defaultTransactionVisibility: TransactionVisibility;

  @ApiProperty({ example: true, description: 'Mặc định ẩn số tiền trên giao diện' })
  defaultAmountHidden: boolean;

  @ApiPropertyOptional({
    description: 'Cấu hình chi tiết về các loại thông báo',
    example: {
      pushNotifications: true,
      emailNotifications: true,
      budgetAlerts: true,
      loanReminders: true,
      mascotEvolutionAlerts: true,
      friendActivityAlerts: true,
    },
  })
  notificationPreferences?: Record<string, unknown>;
}
