import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import {
  InAppNotificationDeliveryProvider,
  NotificationDeliveryPayload,
  NotificationDeliveryProvider,
  UnconfiguredNotificationDeliveryProvider,
} from './notification-delivery.provider';

interface SendNotificationData {
  title: string;
  body: string;
  type: string;
  channel?: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
  idempotencyKey?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly deliveryProviders = new Map<string, NotificationDeliveryProvider>([
    ['in_app', new InAppNotificationDeliveryProvider()],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
  ) {}

  async send(orgId: string, recipientId: string, data: SendNotificationData) {
    const channel = data.channel ?? 'in_app';
    const metadata = this.withIdempotencyKey(data.metadata, data.idempotencyKey);

    if (data.idempotencyKey) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          orgId,
          recipientId,
          type: data.type,
          metadata: { path: ['idempotencyKey'], equals: data.idempotencyKey },
        },
      });
      if (existing) {
        this.logger.debug(`Notification idempotency hit: ${data.idempotencyKey}`);
        return existing;
      }
    }

    const prefDisabled = await this.prisma.notificationPreference.findFirst({
      where: { userId: recipientId, channel, eventType: data.type, enabled: false },
    });
    if (prefDisabled) {
      this.logger.debug(
        `Notification suppressed by preference: ${data.type} / ${channel} for ${recipientId}`,
      );
      return null;
    }

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { orgId_eventType_channel: { orgId, eventType: data.type, channel } },
    });
    const templateVariables = this.asTemplateVariables(metadata);

    const title = template?.isActive
      ? this.renderTemplate(template.title, templateVariables)
      : data.title;
    const body = template?.isActive
      ? this.renderTemplate(template.body, templateVariables)
      : data.body;

    const notification = await this.prisma.notification.create({
      data: {
        orgId,
        recipientId,
        title,
        body,
        type: data.type,
        channel,
        actionUrl: data.actionUrl,
        metadata,
      },
    });

    await this.prisma.notificationDeliveryLog.create({
      data: {
        notificationId: notification.id,
        channel,
        status: channel === 'in_app' ? 'delivered' : 'pending',
        sentAt: channel === 'in_app' ? new Date() : null,
      },
    });

    this.logger.debug(`Notification sent: ${data.type} → ${recipientId} (${channel})`);
    return notification;
  }

  async processPendingDeliveries(limit = 50) {
    const pending = await this.prisma.notificationDeliveryLog.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const summary = { total: pending.length, delivered: 0, failed: 0, skipped: 0 };

    for (const log of pending) {
      const lock = await this.prisma.notificationDeliveryLog.updateMany({
        where: { id: log.id, status: 'pending' },
        data: { status: 'sending', attempts: { increment: 1 } },
      });

      if (lock.count === 0) {
        summary.skipped += 1;
        continue;
      }

      const notification = await this.prisma.notification.findFirst({
        where: { id: log.notificationId },
      });

      if (!notification) {
        await this.prisma.notificationDeliveryLog.update({
          where: { id: log.id },
          data: { status: 'failed', lastError: 'notification_not_found' },
        });
        summary.failed += 1;
        continue;
      }

      const provider =
        this.deliveryProviders.get(log.channel) ??
        new UnconfiguredNotificationDeliveryProvider(log.channel);
      const result = await provider.deliver(this.toDeliveryPayload(notification, log.channel));

      await this.prisma.notificationDeliveryLog.update({
        where: { id: log.id },
        data: {
          status: result.status,
          lastError: result.error ?? null,
          sentAt: result.status === 'delivered' ? (result.sentAt ?? new Date()) : null,
        },
      });

      if (result.status === 'delivered') summary.delivered += 1;
      else if (result.status === 'failed') summary.failed += 1;
      else summary.skipped += 1;
    }

    return summary;
  }

  async sendBulk(orgId: string, recipientIds: string[], data: SendNotificationData) {
    const results = await Promise.allSettled(
      recipientIds.map((rid) => this.send(orgId, rid, data)),
    );

    const sent = results.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
    const suppressed = results.filter((r) => r.status === 'fulfilled' && r.value === null).length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(`Bulk notification: ${sent} sent, ${suppressed} suppressed, ${failed} failed`);

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.NOTIFICATION.BULK_SENT,
      aggregateId: orgId,
      aggregateType: 'Organization',
      payload: { type: data.type, total: recipientIds.length, sent, suppressed, failed },
      actorUserId: orgId,
    });

    return { sent, suppressed, failed, total: recipientIds.length };
  }

  async findByRecipient(
    orgId: string,
    recipientId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ) {
    const where: Prisma.NotificationWhereInput = {
      orgId,
      recipientId,
      ...(unreadOnly && { isRead: false }),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async markRead(orgId: string, notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, orgId, recipientId: userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    if (notification.isRead) return notification;

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.NOTIFICATION.READ,
      aggregateId: notificationId,
      aggregateType: 'Notification',
      payload: { type: notification.type },
      actorUserId: userId,
    });

    return updated;
  }

  async markAllRead(orgId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { orgId, recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { markedCount: result.count };
  }

  async getUnreadCount(orgId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: { orgId, recipientId: userId, isRead: false },
    });
    return { count };
  }

  // ── Preferences ──

  async getPreferences(orgId: string, userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { orgId, userId },
    });
  }

  async updatePreference(
    orgId: string,
    userId: string,
    channel: string,
    eventType: string,
    enabled: boolean,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_channel_eventType: { userId, channel, eventType } },
      create: { orgId, userId, channel, eventType, enabled },
      update: { enabled },
    });
  }

  // ── Templates ──

  async getTemplates(orgId: string) {
    return this.prisma.notificationTemplate.findMany({
      where: { orgId },
      orderBy: { eventType: 'asc' },
    });
  }

  async upsertTemplate(
    orgId: string,
    data: { eventType: string; channel: string; title: string; body: string; isActive?: boolean },
  ) {
    return this.prisma.notificationTemplate.upsert({
      where: {
        orgId_eventType_channel: { orgId, eventType: data.eventType, channel: data.channel },
      },
      create: { orgId, ...data },
      update: { title: data.title, body: data.body, isActive: data.isActive ?? true },
    });
  }

  // ── Quiet Hours (22:00-07:00 for members under 18) ──

  isQuietHours(memberBirthDate?: Date): boolean {
    const now = new Date();
    const hour = now.getHours();
    const isQuietTime = hour >= 22 || hour < 7;

    if (!isQuietTime) return false;
    if (!memberBirthDate) return false;

    const age = Math.floor(
      (now.getTime() - memberBirthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    return age < 18;
  }

  renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
  }

  private withIdempotencyKey(
    metadata: Prisma.InputJsonValue | undefined,
    idempotencyKey: string | undefined,
  ): Prisma.InputJsonObject {
    const base =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? { ...(metadata as Prisma.InputJsonObject) }
        : {};

    if (idempotencyKey) {
      base.idempotencyKey = idempotencyKey;
    }

    return base;
  }

  private asTemplateVariables(metadata: Prisma.InputJsonObject): Record<string, string> {
    return Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [key, String(value ?? '')]),
    );
  }

  private toDeliveryPayload(
    notification: {
      id: string;
      orgId: string;
      recipientId: string;
      title: string;
      body: string;
      type: string;
      channel: string;
      actionUrl: string | null;
      metadata: Prisma.JsonValue;
    },
    channel: string,
  ): NotificationDeliveryPayload {
    return {
      notificationId: notification.id,
      orgId: notification.orgId,
      recipientId: notification.recipientId,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      channel,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
    };
  }
}
