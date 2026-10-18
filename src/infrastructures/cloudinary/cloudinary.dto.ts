import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CLOUDINARY_CONSTANTS } from './cloudinary.constant';

export interface IUploadMediaInput {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}

export class UploadMediaDto {
  @ApiPropertyOptional({
    description: 'Thư mục lưu trữ trên Cloudinary (vd: finora/receipts, finora/avatars)',
    example: 'finora/receipts',
  })
  @IsString()
  @IsOptional()
  folder?: string;
}

export class DeleteMediaDto {
  @ApiProperty({
    description: 'Public ID của media trên Cloudinary',
    example: 'finora/receipts/h2k8f9g...',
  })
  @IsString()
  @IsNotEmpty()
  publicId: string;

  @ApiPropertyOptional({
    description: 'Loại tài nguyên: image, video, raw, auto',
    example: 'image',
    default: 'image',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase?.() ?? 'image')
  @IsIn(CLOUDINARY_CONSTANTS.ALLOWED_RESOURCE_TYPES)
  resourceType?: string;
}

export class UploadMediaResponseDto {
  @ApiProperty()
  publicId: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  secureUrl: string;

  @ApiPropertyOptional()
  format?: string;

  @ApiPropertyOptional()
  width?: number;

  @ApiPropertyOptional()
  height?: number;

  @ApiPropertyOptional()
  bytes?: number;

  @ApiPropertyOptional()
  duration?: number;
}
