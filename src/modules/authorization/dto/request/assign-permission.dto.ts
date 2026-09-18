import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty({
    type: [String],
    example: ['c8b9e67c-46df-5efd-cb2d-b5079ef83716'],
    description: 'Danh sách Permission UUID cần gán cho vai trò',
  })
  @IsArray({ message: 'permissionIds phải là một mảng' })
  @IsUUID('4', {
    each: true,
    message: 'Mỗi permissionId phải là UUID v4 hợp lệ',
  })
  permissionIds: string[];
}
