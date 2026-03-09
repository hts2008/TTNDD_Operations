import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database';
import { REQUIRE_MODULE_KEY } from '../../../common/decorators/require-module.decorator';
import type { CurrentUserPayload } from '../../../common/decorators';

/**
 * T-0024: ModuleGuard — Feature flag enforcement at runtime.
 *
 * Checks organization.settings.modules[moduleName] === true.
 * Returns 403 MODULE_DISABLED if the module is disabled for the org.
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  private readonly logger = new Logger(ModuleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleName = this.reflector.getAllAndOverride<string>(REQUIRE_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @RequireModule decorator → allow
    if (!moduleName) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user?.orgId) {
      throw new ForbiddenException('User context required for module check');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: user.orgId },
      select: { settings: true },
    });

    if (!org) {
      throw new ForbiddenException('Organization not found');
    }

    const settings = org.settings as Record<string, unknown>;
    const modules = (settings?.modules ?? {}) as Record<string, boolean>;

    if (!modules[moduleName]) {
      this.logger.warn(
        `Module '${moduleName}' is disabled for org '${user.orgId}' — blocking request`,
      );
      throw new ForbiddenException({
        statusCode: 403,
        error: 'MODULE_DISABLED',
        message: `Module '${moduleName}' is not enabled for your organization`,
        module: moduleName,
      });
    }

    return true;
  }
}
