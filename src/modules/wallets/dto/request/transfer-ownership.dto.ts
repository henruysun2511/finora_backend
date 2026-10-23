import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    description: 'UUID của thành viên được chuyển giao quyền chủ sở hữu ví',
  })
  @IsNotEmpty({ message: 'newOwnerId không được để trống' })
  @IsUUID('4', { message: 'newOwnerId phải là UUID hợp lệ' })
  newOwnerId: string;
}
