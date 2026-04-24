import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../database';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { verifyToken: jest.Mock };
  let config: { get: jest.Mock };
  let prisma: {
    user: { findUnique: jest.Mock };
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@ttndd.org',
    firebaseUid: 'firebase-uid-1',
    orgMembers: [
      {
        id: 'member-1',
        orgId: 'org-1',
        role: 'leader',
        status: 'active',
      },
    ],
  };

  const mockPayload = {
    userId: 'user-1',
    orgId: 'org-1',
    role: 'leader',
    email: 'test@ttndd.org',
    firebaseUid: 'firebase-uid-1',
  };

  beforeEach(async () => {
    authService = {
      verifyToken: jest.fn(),
    };

    config = {
      get: jest.fn(),
    };

    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    mockFetch.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/login — DEV mode', () => {
    beforeEach(() => {
      config.get.mockImplementation((key: string) => {
        if (key === 'APP_ENV') return 'development';
        return undefined;
      });
    });

    it('should return user + dev token for valid email in dev mode', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await controller.login({
        email: 'test@ttndd.org',
        password: 'anything',
      });

      expect(result).toEqual({
        user: expect.objectContaining({
          userId: 'user-1',
          orgId: 'org-1',
          role: 'leader',
          email: 'test@ttndd.org',
        }),
        token: 'dev:firebase-uid-1',
      });
    });

    it('should throw UnauthorizedException for unknown email in dev mode', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        controller.login({ email: 'unknown@ttndd.org', password: 'test' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when user has no active org members in dev mode', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        orgMembers: [],
      });

      await expect(
        controller.login({ email: 'test@ttndd.org', password: 'test' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/login — Production mode', () => {
    beforeEach(() => {
      config.get.mockImplementation((key: string) => {
        if (key === 'APP_ENV') return 'production';
        if (key === 'FIREBASE_API_KEY') return 'test-api-key';
        return undefined;
      });
    });

    it('should authenticate via Firebase REST API and return user + token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            idToken: 'firebase-id-token',
            localId: 'firebase-uid-1',
          }),
      });
      authService.verifyToken.mockResolvedValue(mockPayload);

      const result = await controller.login({
        email: 'test@ttndd.org',
        password: 'correct-pass',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('identitytoolkit.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test@ttndd.org'),
        }),
      );
      expect(authService.verifyToken).toHaveBeenCalledWith('firebase-id-token');
      expect(result).toEqual({
        user: mockPayload,
        token: 'firebase-id-token',
      });
    });

    it('should throw UnauthorizedException when Firebase returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: 'INVALID_PASSWORD' },
          }),
      });

      await expect(
        controller.login({ email: 'test@ttndd.org', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when FIREBASE_API_KEY is not configured', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'APP_ENV') return 'production';
        return undefined; // No API key
      });

      await expect(
        controller.login({ email: 'test@ttndd.org', password: 'test' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when Firebase succeeds but user not in local DB', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            idToken: 'firebase-id-token',
            localId: 'unknown-uid',
          }),
      });
      authService.verifyToken.mockResolvedValue(null);

      await expect(
        controller.login({ email: 'test@ttndd.org', password: 'correct' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when network error occurs', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        controller.login({ email: 'test@ttndd.org', password: 'test' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user payload', async () => {
      const result = await controller.me(mockPayload as any);
      expect(result).toEqual({ user: mockPayload });
    });
  });
});
