import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { WalletMemberRole } from '../../../../common/enums/wallet-member-role.enum';

export class InviteWalletMemberDto {
  @ApiPropertyOptional({
    example: 'friend@gmail.com',
    description: 'Địa chỉ email của người dùng cần mời (bắt buộc nếu không truyền userId)',
  })
  @ValidateIf((o) => !o.userId || o.email)
  @IsEmail({}, { message: 'Email người được mời không đúng định dạng' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @ApiPropertyOptional({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: 'UUID của người dùng cần mời (bắt buộc nếu không truyền email)',
  })
  @ValidateIf((o) => !o.email || o.userId)
  @IsUUID('4', { message: 'userId người được mời phải là UUID hợp lệ' })
  userId?: string;

  @ApiPropertyOptional({
    enum: [WalletMemberRole.EDITOR, WalletMemberRole.VIEWER],
    default: WalletMemberRole.VIEWER,
    example: WalletMemberRole.EDITOR,
    description: 'Vai trò ban đầu được gán cho thành viên (editor hoặc viewer)',
  })
  @IsOptional()
  @IsIn([WalletMemberRole.EDITOR, WalletMemberRole.VIEWER], {
    message: 'Vai trò ban đầu chỉ có thể là editor hoặc viewer',
  })
  role?: WalletMemberRole = WalletMemberRole.VIEWER;
}
