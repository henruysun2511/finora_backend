import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthProvider } from '../../../../common/enums/auth-provider.enum';
import { UserStatus } from '../../../../common/enums/user-status.enum';

export class RoleSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'ADMIN' })
  code: string;

  @ApiProperty({ example: 'Quản trị viên' })
  name: string;
}

export class UserResponseDto {
  @ApiProperty({ example: 'a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ example: 'nguyen.van.a@finora.vn' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiPropertyOptional({ example: '0987654321' })
  phone?: string;

  @ApiPropertyOptional()
  avatar?: string;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.LOCAL })
  authProvider: AuthProvider;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ type: [RoleSummaryDto] })
  roles?: RoleSummaryDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
