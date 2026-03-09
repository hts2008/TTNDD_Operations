import { SetMetadata } from '@nestjs/common';

/**
 * T-0024: Decorator to require a module to be enabled for the current org.
 *
 * Usage: @RequireModule('rewards') on a controller or method.
 * The ModuleGuard checks organization.settings.modules[moduleName].
 */
export const REQUIRE_MODULE_KEY = 'require_module';
export const RequireModule = (moduleName: string) => SetMetadata(REQUIRE_MODULE_KEY, moduleName);
