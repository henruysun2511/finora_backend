import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';
import { WalletMemberRole } from '../../../../common/enums/wallet-member-role.enum';

export class UpdateWalletMemberRoleDto {
  @ApiProperty({
    enum: [WalletMemberRole.EDITOR, WalletMemberRole.VIEWER],
    example: WalletMemberRole.VIEWER,
    description: 'Vai trò mới của thành viên trong ví (editor hoặc viewer)',
  })
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  @IsIn([WalletMemberRole.EDITOR, WalletMemberRole.VIEWER], {
    message: 'Vai trò cập nhật chỉ có thể là editor hoặc viewer',
  })
  role: WalletMemberRole;
}
