import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MascotSimpleResponseDto {
  @ApiProperty({ example: 'b0a3c2e1-4567-4890-a123-bcdef0123456' })
  id: string;

  @ApiProperty({ example: 'nora' })
  tierName: string;

  @ApiProperty({ example: 'Huấn Luyện Viên Đời Sống' })
  displayName: string;

  @ApiPropertyOptional({ example: '/assets/mascots/nora.svg' })
  mascotAssetUrl?: string;
}
