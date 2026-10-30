import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleMobileAuthDto {
  @ApiProperty({
    description:
      'Google ID Token nhận được từ Google Sign-In SDK trên ứng dụng di động',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString({ message: 'idToken phải là chuỗi' })
  @IsNotEmpty({ message: 'idToken không được để trống' })
  idToken: string;
}
