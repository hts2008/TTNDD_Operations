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
    actionUrl: null,
    metadata: {},
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
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ id: 'dl-1' }),
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

  describe('send idempotency', () => {
    it('should return existing notification when idempotency key already exists', async () => {
      prisma.notification.findFirst.mockResolvedValue(mockNotification);

      const result = await service.send('org-1', 'u-1', {
        title: 'Hi',
        body: 'Hello',
        type: 'test',
        idempotencyKey: 'event-1:u-1',
      });

      expect(result).toBe(mockNotification);
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: {
          orgId: 'org-1',
          recipientId: 'u-1',
          type: 'test',
          metadata: { path: ['idempotencyKey'], equals: 'event-1:u-1' },
        },
      });
    });
  });

  describe('processPendingDeliveries', () => {
    it('should deliver pending in-app logs exactly once using a status lock', async () => {
      prisma.notificationDeliveryLog.findMany.mockResolvedValue([
        { id: 'dl-1', notificationId: 'n-1', channel: 'in_app', status: 'pending', attempts: 0 },
      ]);
      prisma.notification.findFirst.mockResolvedValue(mockNotification);

      const result = await service.processPendingDeliveries();

      expect(result).toEqual({ total: 1, delivered: 1, failed: 0, skipped: 0 });
      expect(prisma.notificationDeliveryLog.updateMany).toHaveBeenCalledWith({
        where: { id: 'dl-1', status: 'pending' },
        data: { status: 'sending', attempts: { increment: 1 } },
      });
      expect(prisma.notificationDeliveryLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dl-1' },
          data: expect.objectContaining({ status: 'delivered', lastError: null }),
        }),
      );
    });

    it('should skip rows already locked by another worker', async () => {
      prisma.notificationDeliveryLog.findMany.mockResolvedValue([
        { id: 'dl-1', notificationId: 'n-1', channel: 'in_app', status: 'pending', attempts: 0 },
      ]);
      prisma.notificationDeliveryLog.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.processPendingDeliveries();

      expect(result).toEqual({ total: 1, delivered: 0, failed: 0, skipped: 1 });
      expect(prisma.notification.findFirst).not.toHaveBeenCalled();
      expect(prisma.notificationDeliveryLog.update).not.toHaveBeenCalled();
    });

    it('should mark unconfigured email provider as skipped with observable error', async () => {
      prisma.notificationDeliveryLog.findMany.mockResolvedValue([
        { id: 'dl-2', notificationId: 'n-2', channel: 'email', status: 'pending', attempts: 0 },
      ]);
      prisma.notification.findFirst.mockResolvedValue({
        ...mockNotification,
        id: 'n-2',
        channel: 'email',
      });

      const result = await service.processPendingDeliveries();

      expect(result).toEqual({ total: 1, delivered: 0, failed: 0, skipped: 1 });
      expect(prisma.notificationDeliveryLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dl-2' },
          data: expect.objectContaining({
            status: 'skipped',
            lastError: 'provider_unconfigured:email',
          }),
        }),
      );
    });
  });

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

  // ── Preferences ────────────────────────────────────────

  describe('getPreferences', () => {
    it('should return preferences for user', async () => {
      prisma.notificationPreference.findMany.mockResolvedValue([
        { id: 'pref-1', channel: 'in_app', eventType: 'test', enabled: true },
      ]);
      const result = await service.getPreferences('org-1', 'u-1');
      expect(result).toHaveLength(1);
      expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-1', userId: 'u-1' },
      });
    });
  });

  describe('updatePreference', () => {
    it('should upsert preference', async () => {
      await service.updatePreference('org-1', 'u-1', 'zalo', 'test_event', false);
      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_channel_eventType: { userId: 'u-1', channel: 'zalo', eventType: 'test_event' },
          },
          create: expect.objectContaining({ enabled: false }),
          update: { enabled: false },
        }),
      );
    });
  });

  // ── Templates ──────────────────────────────────────────

  describe('getTemplates', () => {
    it('should return templates ordered by eventType', async () => {
      prisma.notificationTemplate.findMany.mockResolvedValue([
        { id: 't-1', eventType: 'a_event' },
        { id: 't-2', eventType: 'b_event' },
      ]);
      const result = await service.getTemplates('org-1');
      expect(result).toHaveLength(2);
      expect(prisma.notificationTemplate.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-1' },
        orderBy: { eventType: 'asc' },
      });
    });
  });

  describe('upsertTemplate', () => {
    it('should upsert template with composite key', async () => {
      await service.upsertTemplate('org-1', {
        eventType: 'member_joined',
        channel: 'in_app',
        title: 'Welcome {{name}}',
        body: 'Chào mừng {{name}} gia nhập!',
      });
      expect(prisma.notificationTemplate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orgId_eventType_channel: {
              orgId: 'org-1',
              eventType: 'member_joined',
              channel: 'in_app',
            },
          },
        }),
      );
    });

    it('should default isActive to true on update', async () => {
      await service.upsertTemplate('org-1', {
        eventType: 'test',
        channel: 'in_app',
        title: 'T',
        body: 'B',
      });
      const call = prisma.notificationTemplate.upsert.mock.calls[0][0];
      expect(call.update.isActive).toBe(true);
    });
  });

  // ── sendBulk ───────────────────────────────────────────

  describe('sendBulk', () => {
    it('should send to multiple recipients and publish event', async () => {
      const result = await service.sendBulk('org-1', ['u-1', 'u-2', 'u-3'], {
        title: 'Announcement',
        body: 'Meeting at 5pm',
        type: 'announcement',
      });
      expect(result.total).toBe(3);
      expect(result.sent).toBe(3);
      expect(result.suppressed).toBe(0);
      expect(domainEvents.publish).toHaveBeenCalled();
    });

    it('should count suppressed notifications', async () => {
      prisma.notificationPreference.findFirst
        .mockResolvedValueOnce({ enabled: false })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ enabled: false });
      const result = await service.sendBulk('org-1', ['u-1', 'u-2', 'u-3'], {
        title: 'Test',
        body: 'Body',
        type: 'test',
      });
      expect(result.suppressed).toBe(2);
      expect(result.sent).toBe(1);
    });
  });

  // ── findByRecipient ────────────────────────────────────

  describe('findByRecipient', () => {
    it('should paginate results with meta', async () => {
      const result = await service.findByRecipient('org-1', 'u-1', 2, 10);
      expect(result.meta).toEqual({ total: 1, page: 2, limit: 10 });
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter unread only when requested', async () => {
      await service.findByRecipient('org-1', 'u-1', 1, 20, true);
      const call = prisma.notification.findMany.mock.calls[0][0];
      expect(call.where.isRead).toBe(false);
    });
  });
});
