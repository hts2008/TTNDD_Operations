import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database';
import {
  CHANNEL_ADAPTERS,
  type ChannelAdapter,
  type ChannelPayload,
} from './adapters';
import { Inject } from '@nestjs/common';

/**
 * Retry Service — STORY-007 T-0184
 *
 * Cron-based retry for failed notification deliveries.
 * - Finds NotificationDeliveryLog entries with status 'pending' or 'failed'
 * - Retries up to 3 times with exponential backoff (1m, 5m, 30m)
 * - After 3 failures → marks as 'dead_letter'
 */
@Injectable()
export class NotificationRetryService {
  private readonly logger = new Logger(NotificationRetryService.name);
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CHANNEL_ADAPTERS) private readonly adapters: ChannelAdapter[],
  ) {}

  /**
   * Run every 2 minutes to pick up pending/failed deliveries.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processRetryQueue() {
    const retryable = await this.prisma.notificationDeliveryLog.findMany({
      where: {
        status: { in: ['pending', 'failed'] },
        retryCount: { lt: this.MAX_RETRIES },
      },
      include: {
        notification: true,
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    if (retryable.length === 0) return;

    this.logger.log(`Retry queue: ${retryable.length} deliveries to process`);

    for (const log of retryable) {
      // Check backoff: skip if not enough time has passed since last attempt
      if (log.lastAttemptAt) {
        const backoffMs = this.getBackoffMs(log.retryCount);
        const elapsed = Date.now() - log.lastAttemptAt.getTime();
        if (elapsed < backoffMs) continue;
      }

      const adapter = this.adapters.find((a) => a.channelName === log.channel);
      if (!adapter || !adapter.isConfigured()) {
        // No adapter or not configured — mark as dead_letter
        await this.prisma.notificationDeliveryLog.update({
          where: { id: log.id },
          data: {
            status: 'dead_letter',
            failureReason: `No configured adapter for channel: ${log.channel}`,
            lastAttemptAt: new Date(),
          },
        });
        continue;
      }

      try {
        const payload: ChannelPayload = {
          recipientId: log.notification.recipientId,
          title: log.notification.title,
          body: log.notification.body,
          actionUrl: log.notification.actionUrl ?? undefined,
          metadata: (log.notification.metadata as Record<string, unknown>) ?? {},
        };

        const result = await adapter.send(log.notification.orgId, payload);

        if (result.success) {
          await this.prisma.notificationDeliveryLog.update({
            where: { id: log.id },
            data: {
              status: 'delivered',
              deliveredAt: new Date(),
              externalId: result.externalId,
              lastAttemptAt: new Date(),
            },
          });
          this.logger.debug(`Delivery ${log.id} succeeded via ${log.channel}`);
        } else {
          const newRetryCount = log.retryCount + 1;
          const newStatus = newRetryCount >= this.MAX_RETRIES ? 'dead_letter' : 'failed';

          await this.prisma.notificationDeliveryLog.update({
            where: { id: log.id },
            data: {
              status: newStatus,
              retryCount: newRetryCount,
              failureReason: result.error,
              lastAttemptAt: new Date(),
            },
          });

          if (newStatus === 'dead_letter') {
            this.logger.warn(`Delivery ${log.id} moved to dead_letter after ${newRetryCount} retries`);
          }
        }
      } catch (err) {
        const newRetryCount = log.retryCount + 1;
        await this.prisma.notificationDeliveryLog.update({
          where: { id: log.id },
          data: {
            status: newRetryCount >= this.MAX_RETRIES ? 'dead_letter' : 'failed',
            retryCount: newRetryCount,
            failureReason: (err as Error).message,
            lastAttemptAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Get dead-letter entries for admin review.
   */
  async getDeadLetterQueue(orgId: string, page = 1, limit = 20) {
    const where = {
      status: 'dead_letter' as const,
      notification: { orgId },
    };

    const [data, total] = await Promise.all([
      this.prisma.notificationDeliveryLog.findMany({
        where,
        include: { notification: { select: { title: true, type: true, recipientId: true } } },
        orderBy: { lastAttemptAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationDeliveryLog.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  private getBackoffMs(retryCount: number): number {
    // Exponential backoff: 1m, 5m, 30m
    const backoffs = [60_000, 300_000, 1_800_000];
    return backoffs[retryCount] ?? backoffs[backoffs.length - 1] ?? 1_800_000;
  }
}
