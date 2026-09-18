import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.permissions) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    const userPermissionCodes: string[] = Array.isArray(user.permissions)
      ? user.permissions.map((p: { code?: string } | string) =>
          typeof p === 'string'
            ? p.toUpperCase()
            : (p.code?.toUpperCase() ?? ''),
        )
      : [];

    const hasPermission = requiredPermissions.every((perm) =>
      userPermissionCodes.includes(perm.toUpperCase()),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Yêu cầu quyền hạn: [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
