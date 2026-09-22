import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ example: 'c8b9e67c-46df-5efd-cb2d-b5079ef83716' })
  id: string;

  @ApiProperty({ example: 'GROUPS_CREATE' })
  code: string;

  @ApiProperty({ example: 'Tạo nhóm mới' })
  name: string;

  @ApiPropertyOptional({ example: 'groups' })
  resource?: string;

  @ApiPropertyOptional({ example: 'create' })
  action?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
