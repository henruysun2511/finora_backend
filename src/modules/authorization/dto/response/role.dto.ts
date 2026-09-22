import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionResponseDto } from './permission.dto';

export class RoleResponseDto {
  @ApiProperty({ example: 'b7a8d56b-35cf-4dfc-ba1c-a4968df72605' })
  id: string;

  @ApiProperty({ example: 'ADMIN' })
  code: string;

  @ApiProperty({ example: 'Quản trị viên' })
  name: string;

  @ApiPropertyOptional({ example: 'Toàn quyền quản trị hệ thống' })
  description?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  isSysAdmin: boolean;

  @ApiPropertyOptional({ type: [PermissionResponseDto] })

  permissions?: PermissionResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
