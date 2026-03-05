import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { DOMAIN_EVENTS } from '@ttndd/constants';
import { PrismaService } from '../../core/database';
import { NotificationsService } from './notifications.service';

/**
 * Listens to domain events from other modules and creates notifications.
 * Each handler is wrapped in try/catch to avoid breaking the event pipeline.
 */
@Injectable()
export class NotificationEventSubscriber {
  private readonly logger = new Logger(NotificationEventSubscriber.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED)
  async onMemberActivated(event: { orgId: string; aggregateId: string; payload: Record<string, unknown> }) {
    try {
      const memberName = (event.payload?.fullName as string) ?? 'Đoàn sinh';
      await this.notifications.send(event.orgId, event.aggregateId, {
        title: 'Chào mừng bạn đến với TTNDD!',
        body: `Xin chào ${memberName}, chúc mừng bạn đã gia nhập Đoàn Thiếu Nhi Đạo Đức. Hãy khám phá hệ thống để bắt đầu hành trình!`,
        type: DOMAIN_EVENTS.HRM.MEMBER_ACTIVATED,
        actionUrl: '/dashboard',
        metadata: { memberName },
      });
    } catch (e) {
      this.logger.warn(`Failed to notify on member activation: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.SESSION.PUBLISHED)
  async onSessionPublished(event: { orgId: string; aggregateId: string; payload: Record<string, unknown> }) {
    try {
      const sessionTitle = (event.payload?.title as string) ?? 'buổi sinh hoạt mới';
      const branchId = event.payload?.branchId as string;
      if (!branchId) return;

      const branchMembers = await this.prisma.orgMember.findMany({
        where: { orgId: event.orgId, branchId, status: 'active' },
        select: { id: true },
      });

      const recipientIds = branchMembers.map((m) => m.id);
      if (recipientIds.length === 0) return;

      await this.notifications.sendBulk(event.orgId, recipientIds, {
        title: 'Buổi sinh hoạt mới',
        body: `Buổi sinh hoạt "${sessionTitle}" đã được lên lịch. Xem chi tiết ngay!`,
        type: DOMAIN_EVENTS.SESSION.PUBLISHED,
        actionUrl: `/sessions/${event.aggregateId}`,
        metadata: { sessionTitle, sessionId: event.aggregateId },
      });
    } catch (e) {
      this.logger.warn(`Failed to notify on session published: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.REWARDS.LEVEL_UP)
  async onLevelUp(event: { orgId: string; aggregateId: string; payload: Record<string, unknown> }) {
    try {
      const newLevel = event.payload?.newLevel ?? event.payload?.level ?? '?';
      await this.notifications.send(event.orgId, event.aggregateId, {
        title: 'Thăng cấp!',
        body: `Chúc mừng! Bạn đã đạt cấp ${newLevel}. Tiếp tục cố gắng nhé!`,
        type: DOMAIN_EVENTS.REWARDS.LEVEL_UP,
        actionUrl: '/profile/exp',
        metadata: { newLevel: String(newLevel) },
      });
    } catch (e) {
      this.logger.warn(`Failed to notify on level up: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.REWARDS.BADGE_AWARDED)
  async onBadgeAwarded(event: { orgId: string; aggregateId: string; payload: Record<string, unknown> }) {
    try {
      const badgeName = (event.payload?.badgeName as string) ?? 'huy hiệu mới';
      await this.notifications.send(event.orgId, event.aggregateId, {
        title: 'Huy hiệu mới!',
        body: `Bạn vừa nhận được huy hiệu "${badgeName}". Xem bộ sưu tập!`,
        type: DOMAIN_EVENTS.REWARDS.BADGE_AWARDED,
        actionUrl: '/profile/badges',
        metadata: { badgeName },
      });
    } catch (e) {
      this.logger.warn(`Failed to notify on badge awarded: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.FINANCE.FEE_OVERDUE)
  async onFeeOverdue(event: { orgId: string; aggregateId: string; payload: Record<string, unknown> }) {
    try {
      const memberId = event.aggregateId;
      const feeType = (event.payload?.feeType as string) ?? 'phí sinh hoạt';
      const amount = event.payload?.amountDue ?? '';

      await this.notifications.send(event.orgId, memberId, {
        title: 'Nhắc nhở đóng phí',
        body: `Khoản ${feeType} ${amount ? `(${amount} VND)` : ''} đã quá hạn. Vui lòng liên hệ Trưởng để thanh toán.`,
        type: DOMAIN_EVENTS.FINANCE.FEE_OVERDUE,
        actionUrl: '/finance/my-fees',
        metadata: { feeType, amount: String(amount) },
      });

      const member = await this.prisma.orgMember.findUnique({
        where: { id: memberId },
        include: { profile: { select: { guardianName: true } }, linkedBy: { select: { id: true } } },
      });
      if (member?.linkedBy?.length) {
        for (const guardian of member.linkedBy) {
          await this.notifications.send(event.orgId, guardian.id, {
            title: 'Nhắc nhở đóng phí cho con em',
            body: `Khoản ${feeType} của Đoàn sinh đã quá hạn. Vui lòng liên hệ Trưởng.`,
            type: DOMAIN_EVENTS.FINANCE.FEE_OVERDUE,
            channel: 'in_app',
            metadata: { feeType, memberId },
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to notify on fee overdue: ${(e as Error).message}`);
    }
  }

  @OnEvent(DOMAIN_EVENTS.EVENT.REGISTRATION_OPENED)
  async onEventRegistrationOpened(event: { orgId: string; aggregateId: string; payload: Record<string, unknown> }) {
    try {
      const eventTitle = (event.payload?.title as string) ?? 'sự kiện mới';
      const targetBranches = (event.payload?.targetBranches as string[]) ?? [];

      const where: Record<string, unknown> = { orgId: event.orgId, status: 'active' };
      if (targetBranches.length > 0) {
        const branches = await this.prisma.branch.findMany({
          where: { orgId: event.orgId, code: { in: targetBranches } },
          select: { id: true },
        });
        where.branchId = { in: branches.map((b) => b.id) };
      }

      const members = await this.prisma.orgMember.findMany({
        where: where as Prisma.OrgMemberWhereInput,
        select: { id: true },
      });

      if (members.length === 0) return;

      await this.notifications.sendBulk(
        event.orgId,
        members.map((m) => m.id),
        {
          title: 'Mở đăng ký sự kiện',
          body: `Sự kiện "${eventTitle}" đã mở đăng ký. Đăng ký ngay!`,
          type: DOMAIN_EVENTS.EVENT.REGISTRATION_OPENED,
          actionUrl: `/events/${event.aggregateId}`,
          metadata: { eventTitle, eventId: event.aggregateId },
        },
      );
    } catch (e) {
      this.logger.warn(`Failed to notify on event registration opened: ${(e as Error).message}`);
    }
  }
}
