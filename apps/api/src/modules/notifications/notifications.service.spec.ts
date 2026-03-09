import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;
  let domainEvents: { publish: jest.Mock };

  const mockNotification = {
    id: 'n-1',
    orgId: 'org-1',
    recipientId: 'u-1',
    title: 'Test',
    body: 'Hello',
    type: 'test',
    channel: 'in_app',
    isRead: false,
    readAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(mockNotification),
        findFirst: jest.fn().mockResolvedValue(mockNotification),
        findMany: jest.fn().mockResolvedValue([mockNotification]),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({ ...mockNotification, isRead: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      notificationPreference: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'pref-1' }),
      },
      notificationTemplate: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'tmpl-1' }),
      },
      notificationDeliveryLog: {
        create: jest.fn().mockResolvedValue({ id: 'dl-1' }),
      },
    };
    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ── send ───────────────────────────────────────────────

  describe('send', () => {
    it('should create notification and delivery log', async () => {
      const result = await service.send('org-1', 'u-1', {
        title: 'Hi',
        body: 'Hello',
        type: 'test',
      });
      expect(result).toBeDefined();
      expect(prisma.notification.create).toHaveBeenCalled();
      expect(prisma.notificationDeliveryLog.create).toHaveBeenCalled();
    });

    it('should suppress when preference disabled', async () => {
      prisma.notificationPreference.findFirst.mockResolvedValue({ enabled: false });
      const result = await service.send('org-1', 'u-1', {
        title: 'Hi',
        body: 'Hello',
        type: 'test',
      });
      expect(result).toBeNull();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should use template when active', async () => {
      prisma.notificationTemplate.findUnique.mockResolvedValue({
        isActive: true,
        title: 'Hello {{name}}',
        body: 'Welcome {{name}}!',
      });
      await service.send('org-1', 'u-1', {
        title: 'fallback',
        body: 'fallback',
        type: 'test',
        metadata: { name: 'Đoàn' },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Hello Đoàn',
            body: 'Welcome Đoàn!',
          }),
        }),
      );
    });
  });

  // ── markRead ───────────────────────────────────────────

  describe('markRead', () => {
    it('should mark notification as read', async () => {
      const result = await service.markRead('org-1', 'n-1', 'u-1');
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isRead: true }) }),
      );
    });

    it('should skip if already read', async () => {
      prisma.notification.findFirst.mockResolvedValue({ ...mockNotification, isRead: true });
      const result = await service.markRead('org-1', 'n-1', 'u-1');
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid notification', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);
      await expect(service.markRead('org-1', 'invalid', 'u-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── markAllRead ────────────────────────────────────────

  describe('markAllRead', () => {
    it('should mark all unread as read', async () => {
      const result = await service.markAllRead('org-1', 'u-1');
      expect(result).toEqual({ markedCount: 5 });
    });
  });

  // ── getUnreadCount ─────────────────────────────────────

  describe('getUnreadCount', () => {
    it('should return count', async () => {
      const result = await service.getUnreadCount('org-1', 'u-1');
      expect(result).toEqual({ count: 1 });
    });
  });

  // ── renderTemplate ─────────────────────────────────────

  describe('renderTemplate', () => {
    it('should replace variables', () => {
      const result = service.renderTemplate('Hello {{name}}, your role: {{role}}', {
        name: 'Đoàn',
        role: 'Leader',
      });
      expect(result).toBe('Hello Đoàn, your role: Leader');
    });

    it('should replace missing vars with empty string', () => {
      const result = service.renderTemplate('Hello {{name}}!', {});
      expect(result).toBe('Hello !');
    });
  });

  // ── isQuietHours ───────────────────────────────────────

  describe('isQuietHours', () => {
    it('should return false when no birthdate', () => {
      expect(service.isQuietHours()).toBe(false);
    });

    it('should return false for adults', () => {
      const adultBirthDate = new Date('1990-01-01');
      // Result depends on current time, but adult should never be quiet-hours restricted
      const result = service.isQuietHours(adultBirthDate);
      expect(result).toBe(false);
    });
  });
});
