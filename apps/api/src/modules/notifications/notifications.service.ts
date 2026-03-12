import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { DOMAIN_EVENTS } from '@ttndd/constants';

interface SendNotificationData {
  title: string;
  body: string;
  type: string;
  channel?: string;
  actionUrl?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
  ) {}

  async send(orgId: string, recipientId: string, data: SendNotificationData) {
    const channel = data.channel ?? 'in_app';

    const prefDisabled = await this.prisma.notificationPreference.findFirst({
      where: { userId: recipientId, channel, eventType: data.type, enabled: false },
    });
    if (prefDisabled) {
      this.logger.debug(`Notification suppressed by preference: ${data.type} / ${channel} for ${recipientId}`);
      return null;
    }

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { orgId_eventType_channel: { orgId, eventType: data.type, channel } },
    });

    const title = template?.isActive
      ? this.renderTemplate(template.title, data.metadata as Record<string, string> ?? {})
      : data.title;
    const body = template?.isActive
      ? this.renderTemplate(template.body, data.metadata as Record<string, string> ?? {})
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
        metadata: data.metadata ?? {},
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
      where: { orgId_eventType_channel: { orgId, eventType: data.eventType, channel: data.channel } },
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

  // ── Plan / Project Reminder Hooks (T-0135) ──

  async notifyPlanSubmitted(orgId: string, planTitle: string, planId: string, reviewerIds: string[]) {
    return this.sendBulk(orgId, reviewerIds, {
      title: 'Kế hoạch cần duyệt',
      body: `Kế hoạch "${planTitle}" đã được gửi để duyệt.`,
      type: 'plan_submitted',
      actionUrl: `/projects/plans/${planId}`,
      metadata: { planId, planTitle } as Prisma.InputJsonValue,
    });
  }

  async notifyPlanApproved(orgId: string, planTitle: string, planId: string, authorId: string) {
    return this.send(orgId, authorId, {
      title: 'Kế hoạch đã được duyệt ✅',
      body: `Kế hoạch "${planTitle}" đã được phê duyệt thành công.`,
      type: 'plan_approved',
      actionUrl: `/projects/plans/${planId}`,
      metadata: { planId, planTitle } as Prisma.InputJsonValue,
    });
  }

  async notifyPlanRejected(orgId: string, planTitle: string, planId: string, authorId: string, reason?: string) {
    return this.send(orgId, authorId, {
      title: 'Kế hoạch bị từ chối ❌',
      body: `Kế hoạch "${planTitle}" bị từ chối.${reason ? ` Lý do: ${reason}` : ''}`,
      type: 'plan_rejected',
      actionUrl: `/projects/plans/${planId}`,
      metadata: { planId, planTitle, reason: reason ?? '' } as Prisma.InputJsonValue,
    });
  }

  async notifyTaskDueSoon(orgId: string, taskTitle: string, taskId: string, assigneeIds: string[], dueDate: string) {
    return this.sendBulk(orgId, assigneeIds, {
      title: 'Công việc sắp đến hạn ⏰',
      body: `"${taskTitle}" đến hạn ngày ${dueDate}.`,
      type: 'task_due_reminder',
      actionUrl: `/projects/tasks/${taskId}`,
      metadata: { taskId, taskTitle, dueDate } as Prisma.InputJsonValue,
    });
  }

  async notifyTaskAssigned(orgId: string, taskTitle: string, taskId: string, assigneeId: string) {
    return this.send(orgId, assigneeId, {
      title: 'Bạn được phân công công việc mới',
      body: `Công việc "${taskTitle}" đã được giao cho bạn.`,
      type: 'task_assigned',
      actionUrl: `/projects/tasks/${taskId}`,
      metadata: { taskId, taskTitle } as Prisma.InputJsonValue,
    });
  }
}

