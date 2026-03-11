import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../../../common/decorators/require-permission.decorator';
import type { CurrentUserPayload } from '../../../common/decorators';
import { hasPermission, type PermissionType } from '../../../modules/org-config/roles.constants';

/**
 * T-0055: PermissionsGuard — Fine-grained permission enforcement.
 *
 * Works with @RequirePermission() decorator.
 * Checks user's role against ROLE_PERMISSIONS map in roles.constants.ts.
 * Uses OR logic: user needs at least ONE of the required permissions.
 *
 * Stack order: AuthGuard → RolesGuard → PermissionsGuard → ModuleGuard
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @RequirePermission decorator → allow
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      throw new ForbiddenException('User context not found');
    }

    // Check if user's role has at least one of the required permissions (OR logic)
    const hasAny = requiredPermissions.some((perm) =>
      hasPermission(user.role, perm as PermissionType),
    );

    if (!hasAny) {
      this.logger.warn(
        `Role '${user.role}' lacks permissions [${requiredPermissions.join(', ')}] — blocking request`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'PERMISSION_DENIED',
        message: `Insufficient permissions. Required (any): ${requiredPermissions.join(', ')}`,
        requiredPermissions,
        userRole: user.role,
      });
    }

    return true;
  }
}
