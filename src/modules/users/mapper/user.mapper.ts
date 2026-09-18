import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { UserResponseDto, RoleSummaryDto } from '../dto/response/user.dto';

@Injectable()
export class UserMapper {
  toResponseDto(user: User): UserResponseDto {
    const roles: RoleSummaryDto[] =
      user.userRoles
        ?.map((ur) => ur.role)
        .filter((r) => r != null)
        .map((role) => ({
          id: role.id,
          code: role.code,
          name: role.name,
        })) ?? [];

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatar: user.avatar,
      authProvider: user.authProvider,
      status: user.status,
      isActive: user.isActive,
      roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  toResponseDtoList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponseDto(user));
  }
}
