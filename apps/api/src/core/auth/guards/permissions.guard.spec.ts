import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from '../../../modules/org-config/roles.constants';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  const mockRequest = (role: string) => ({
    user: { userId: 'u1', orgId: 'o1', role, email: 'test@test.com', firebaseUid: 'fb1' },
  });

  const mockContext = (request: unknown) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('should allow when no permissions required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext(mockRequest('member'));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow super_admin for any permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ORG_CHART_MANAGE]);
    const ctx = mockContext(mockRequest('super_admin'));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow admin for ORG_CHART_VIEW', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ORG_CHART_VIEW]);
    const ctx = mockContext(mockRequest('admin'));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow leader for ORG_CHART_VIEW', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ORG_CHART_VIEW]);
    const ctx = mockContext(mockRequest('leader'));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow sub_leader for ORG_CHART_VIEW', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ORG_CHART_VIEW]);
    const ctx = mockContext(mockRequest('sub_leader'));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny member for ORG_CHART_MANAGE', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ORG_CHART_MANAGE]);
    const ctx = mockContext(mockRequest('member'));
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should deny sub_leader for ORG_CHART_MANAGE', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ORG_CHART_MANAGE]);
    const ctx = mockContext(mockRequest('sub_leader'));
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should allow leader for VOLUNTEER_MANAGE', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.VOLUNTEER_MANAGE]);
    const ctx = mockContext(mockRequest('leader'));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow member for VOLUNTEER_SELF', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.VOLUNTEER_SELF]);
    const ctx = mockContext(mockRequest('member'));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw when user context is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ORG_CHART_VIEW]);
    const ctx = mockContext({});
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should use OR logic — pass if any permission matches', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.ORG_CHART_MANAGE, Permission.ORG_CHART_VIEW]);
    const ctx = mockContext(mockRequest('sub_leader'));
    // sub_leader has ORG_CHART_VIEW but not ORG_CHART_MANAGE — should pass (OR logic)
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
