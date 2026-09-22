import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào tài nguyên này',
      );
    }

    if (user.isSysAdmin === true) {
      return true;
    }

    if (!user.roles) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập vào tài nguyên này',
      );
    }


    const userRoleCodes: string[] = Array.isArray(user.roles)
      ? user.roles.map((r: { code?: string } | string) =>
          typeof r === 'string'
            ? r.toUpperCase()
            : (r.code?.toUpperCase() ?? ''),
        )
      : [];

    const hasRole = requiredRoles.some((role) =>
      userRoleCodes.includes(role.toUpperCase()),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Yêu cầu vai trò: [${requiredRoles.join(', ')}]`,
      );
    }

    return true;
  }
}
