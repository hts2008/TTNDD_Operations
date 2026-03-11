import { SetMetadata } from '@nestjs/common';

/**
 * T-0055: Decorator to require specific permissions for an endpoint.
 *
 * Usage: @RequirePermission('org:update', 'branch:create') on a controller method.
 * The PermissionsGuard checks the user's role against ROLE_PERMISSIONS.
 * All listed permissions use OR logic — user needs at least one.
 */
export const PERMISSIONS_KEY = 'required_permissions';
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
