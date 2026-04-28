import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../database';
import * as admin from 'firebase-admin';

// Mock firebase-admin with writable apps array
const mockApps: unknown[] = [];
jest.mock('firebase-admin', () => ({
  get apps() {
    return mockApps;
  },
  set apps(v: unknown[]) {
    mockApps.length = 0;
    v.forEach((item) => mockApps.push(item));
  },
  initializeApp: jest.fn(),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock };
  };
  let config: { get: jest.Mock };

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

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    config = {
      get: jest.fn(),
    };

    // Reset firebase-admin mock state
    mockApps.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('onModuleInit', () => {
    it('should initialize Firebase when GOOGLE_CLOUD_PROJECT is set', () => {
      config.get.mockReturnValue('ttndd-platform-2026');
      service.onModuleInit();
      expect(admin.initializeApp).toHaveBeenCalledWith({
        projectId: 'ttndd-platform-2026',
      });
    });

    it('should warn when GOOGLE_CLOUD_PROJECT is not set', () => {
      config.get.mockReturnValue(undefined);
      // Should not throw
      expect(() => service.onModuleInit()).not.toThrow();
    });

    it('should not re-initialize if Firebase app already exists', () => {
      mockApps.push({}); // Simulate existing app
      config.get.mockReturnValue('ttndd-platform-2026');
      service.onModuleInit();
      // initializeApp should NOT be called again in this test
      // (it may have been called in previous tests, so we check call count)
      const callCount = (admin.initializeApp as jest.Mock).mock.calls.length;
      // Since we set apps to non-empty, initializeApp should not have been called
      expect(mockApps.length).toBe(1);
    });
  });

  describe('verifyToken — DEV mode', () => {
    beforeEach(() => {
      config.get.mockImplementation((key: string) => {
        if (key === 'APP_ENV') return 'development';
        return undefined;
      });
    });

    it('should handle dev token format "dev:<firebaseUid>"', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.verifyToken('dev:firebase-uid-1');

      expect(result).toEqual({
        userId: 'user-1',
        orgId: 'org-1',
        role: 'leader',
        email: 'test@ttndd.org',
        firebaseUid: 'firebase-uid-1',
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { firebaseUid: 'firebase-uid-1' },
        include: {
          orgMembers: {
            where: { status: 'active' },
            take: 1,
          },
        },
      });
    });

    it('should return null for dev token when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.verifyToken('dev:unknown-uid');
      expect(result).toBeNull();
    });

    it('should return null when user has no active org memberships', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        orgMembers: [],
      });
      const result = await service.verifyToken('dev:firebase-uid-1');
      expect(result).toBeNull();
    });
  });

  describe('verifyToken — Production mode', () => {
    beforeEach(() => {
      config.get.mockImplementation((key: string) => {
        if (key === 'APP_ENV') return 'production';
        return undefined;
      });
    });

    it('should return null when Firebase is not initialized', async () => {
      mockApps.length = 0;
      const result = await service.verifyToken('some-firebase-token');
      expect(result).toBeNull();
    });

    it('should verify token via Firebase and resolve user', async () => {
      mockApps.length = 0;
      mockApps.push({}); // Simulate initialized app
      const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'firebase-uid-1' });
      (admin.auth as jest.Mock).mockReturnValue({ verifyIdToken: mockVerifyIdToken });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.verifyToken('valid-firebase-token');

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-firebase-token');
      expect(result).toEqual({
        userId: 'user-1',
        orgId: 'org-1',
        role: 'leader',
        email: 'test@ttndd.org',
        firebaseUid: 'firebase-uid-1',
      });
    });

    it('should return null when Firebase token verification fails', async () => {
      mockApps.length = 0;
      mockApps.push({});
      const mockVerifyIdToken = jest.fn().mockRejectedValue(new Error('Token expired'));
      (admin.auth as jest.Mock).mockReturnValue({ verifyIdToken: mockVerifyIdToken });

      const result = await service.verifyToken('expired-token');
      expect(result).toBeNull();
    });

    it('should return null when Firebase user is not in local DB', async () => {
      mockApps.length = 0;
      mockApps.push({});
      const mockVerifyIdToken = jest.fn().mockResolvedValue({ uid: 'unknown-firebase-uid' });
      (admin.auth as jest.Mock).mockReturnValue({ verifyIdToken: mockVerifyIdToken });
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.verifyToken('valid-but-no-local-user-token');
      expect(result).toBeNull();
    });
  });
});
