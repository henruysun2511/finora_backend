import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MascotTierResponseDto {
  @ApiProperty({ example: 'b0a3c2e1-4567-4890-a123-bcdef0123456' })
  id: string;

  @ApiProperty({ example: 'nora' })
  tierName: string;

  @ApiProperty({ example: 'Huấn Luyện Viên Đời Sống' })
  displayName: string;

  @ApiProperty({ example: 5000000 })
  minNetWorth: number;

  @ApiPropertyOptional({ example: 20000000 })
  maxNetWorth?: number;

  @ApiProperty({ example: 4 })
  displayOrder: number;

  @ApiProperty({
    example: [
      'Khoản chi 500k này vẫn nằm trong quỹ "Giải trí" của tháng. Bạn hoàn toàn có thể chi trả mà không ảnh hưởng mục tiêu chung.',
    ],
  })
  quotes: string[];

  @ApiProperty({
    example:
      'Bạn là Nora - Huấn Luyện Viên Đời Sống, điềm tĩnh, logic và thân thiện...',
  })
  systemPrompt: string;

  @ApiProperty({
    example:
      '<div class="card" data-mascot="nora" style="--blob-color: #0072d5; --accent: #0055a9;">...</div>',
  })
  htmlContent: string;

  @ApiPropertyOptional({ example: '/assets/mascots/nora.svg' })
  mascotAssetUrl?: string;

  @ApiProperty({ example: '2026-10-19T23:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-19T23:00:00.000Z' })
  updatedAt: Date;
}
