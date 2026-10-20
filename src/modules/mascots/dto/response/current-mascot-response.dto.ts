import { ApiProperty } from '@nestjs/swagger';
import { MascotTierResponseDto } from './mascot-tier-response.dto';
import { MascotTone } from '../../enums/mascot-tone.enum';
import { MascotSensitivity } from '../../enums/mascot-sensitivity.enum';

export class CurrentMascotResponseDto {
  @ApiProperty({ example: 12500000, description: 'Tài sản ròng hiện tại (VND)' })
  netWorth: number;

  @ApiProperty({ example: 15000000, description: 'Tổng số dư ví (VND)' })
  totalWalletBalance: number;

  @ApiProperty({ example: 2500000, description: 'Tổng dư nợ đang vay (VND)' })
  totalDebt: number;

  @ApiProperty({ example: true, description: 'Cờ bật/tắt hiển thị mascot' })
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
    description: 'Độ nhạy cảnh báo của linh vật',
  })
  mascotSensitivity: MascotSensitivity;

  @ApiProperty({
    example:
      'Khoản chi 500k này vẫn nằm trong quỹ "Giải trí" của tháng. Bạn hoàn toàn có thể chi trả mà không ảnh hưởng mục tiêu chung.',
    description: 'Lời chào/lời khuyên ngẫu nhiên tương ứng với tính cách linh vật',
  })
  greeting: string;

  @ApiProperty({
    type: MascotTierResponseDto,
    description: 'Thông tin linh vật hiện tại',
  })
  mascot: MascotTierResponseDto;
}
