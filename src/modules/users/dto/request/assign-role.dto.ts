import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    type: [String],
    example: ['b7a8d56b-35cf-4dfc-ba1c-a4968df72605'],
    description: 'Danh sách Role UUID cần gán cho người dùng',
  })
  @IsArray({ message: 'roleIds phải là một mảng' })
  @IsUUID('4', { each: true, message: 'Mỗi roleId phải là UUID v4 hợp lệ' })
  roleIds: string[];
}
