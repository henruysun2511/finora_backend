import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh Token đã được cấp trước đó',
  })
  @IsString()
  @IsNotEmpty({ message: 'refreshToken không được để trống' })
  refreshToken: string;
}
