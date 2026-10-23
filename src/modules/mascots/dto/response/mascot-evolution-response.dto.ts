import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MascotTierResponseDto } from './mascot-tier-response.dto';

export class MascotEvolutionResponseDto {
  @ApiProperty({
    example: true,
    description: 'Có sự thay đổi linh vật sau khi biến động tài sản ròng',
  })
  evolved: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'True nếu là thăng hạng cấp cao hơn, false nếu tụt hạng',
  })
  isLevelUp?: boolean;

  @ApiProperty({
    example: 12500000,
    description: 'Tài sản ròng hiện tại (VND)',
  })
  netWorth: number;

  @ApiProperty({
    type: MascotTierResponseDto,
    description: 'Thông tin linh vật mới nhất đang đồng hành',
  })
  currentMascot: MascotTierResponseDto;

  @ApiPropertyOptional({
    type: MascotTierResponseDto,
    description: 'Thông tin linh vật ở cấp bậc trước đó (nếu có)',
  })
  previousMascot?: MascotTierResponseDto;

  @ApiProperty({
    example: 'Chúc mừng bạn đã thăng hạng lên Huấn Luyện Viên Đời Sống!',
    description: 'Thông điệp chúc mừng hoặc nhắc nhở',
  })
  message: string;
}
