import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtConfig } from '../../../config/jwt.config';
import { UserRepository } from '../../users/repository/user.repository';
import { UserMapper } from '../../users/mapper/user.mapper';

export interface JwtPayload {
  sub: string;
  email: string;
  roles?: string[];
  permissions?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userMapper: UserMapper,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JwtConfig.SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa',
      );
    }

    const roles: string[] =
      user.userRoles
        ?.map((ur) => ur.role?.code)
        .filter((code): code is string => Boolean(code)) ?? [];

    const permissions: string[] =
      user.userRoles?.flatMap(
        (ur) =>
          ur.role?.rolePermissions
            ?.map((rp) => rp.permission?.code)
            .filter((code): code is string => Boolean(code)) ?? [],
      ) ?? [];

    const userDto = this.userMapper.toResponseDto(user);

    return {
      ...userDto,
      roles,
      permissions: Array.from(new Set(permissions)),
    };
  }
}
