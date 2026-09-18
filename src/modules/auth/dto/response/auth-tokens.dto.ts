import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JSON Web Token dùng để xác thực các request tiếp theo',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh Token dùng để cấp mới Access Token',
  })
  refreshToken: string;

  @ApiProperty({
    example: '1d',
    description: 'Thời gian hết hạn của Access Token',
  })
  expiresIn: string;
}
