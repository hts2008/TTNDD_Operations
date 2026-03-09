import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleGuard } from './module.guard';
import { PrismaService } from '../../database';
import { REQUIRE_MODULE_KEY } from '../../../common/decorators/require-module.decorator';

describe('ModuleGuard', () => {
  let guard: ModuleGuard;
  let reflector: Reflector;
  let prisma: { organization: { findUnique: jest.Mock } };

  const mockContext = (user: any) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  beforeEach(async () => {
    prisma = {
      organization: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ModuleGuard, Reflector, { provide: PrismaService, useValue: prisma }],
    }).compile();

    guard = module.get<ModuleGuard>(ModuleGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should allow when no @RequireModule decorator', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const result = await guard.canActivate(mockContext({ orgId: 'org-1' }));
    expect(result).toBe(true);
  });

  it('should allow when module is enabled', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('hrm');
    prisma.organization.findUnique.mockResolvedValue({
      settings: { modules: { hrm: true, finance: true } },
    });

    const result = await guard.canActivate(mockContext({ orgId: 'org-1' }));
    expect(result).toBe(true);
  });

  it('should throw 403 when module is disabled', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('hrm');
    prisma.organization.findUnique.mockResolvedValue({
      settings: { modules: { hrm: false } },
    });

    await expect(guard.canActivate(mockContext({ orgId: 'org-1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw 403 when module is not in settings', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('lms');
    prisma.organization.findUnique.mockResolvedValue({
      settings: { modules: {} },
    });

    await expect(guard.canActivate(mockContext({ orgId: 'org-1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should handle empty settings gracefully', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('hrm');
    prisma.organization.findUnique.mockResolvedValue({ settings: {} });

    await expect(guard.canActivate(mockContext({ orgId: 'org-1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw when user has no orgId', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('hrm');

    await expect(guard.canActivate(mockContext({}))).rejects.toThrow(ForbiddenException);
  });
});
