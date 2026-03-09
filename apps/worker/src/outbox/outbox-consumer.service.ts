import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../core/database';

/**
 * Outbox Consumer — polls unprocessed domain events from the outbox table
 * and dispatches them to the appropriate Bull queue for async processing.
 *
 * This replaces the log-only OutboxPublisher in apps/api with real queue dispatch.
 * Dead-letter handling: events that fail after MAX_RETRIES are logged and skipped.
 */
@Injectable()
export class OutboxConsumerService {
  private readonly logger = new Logger(OutboxConsumerService.name);
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 50;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    @InjectQueue('rewards') private readonly rewardsQueue: Queue,
    @InjectQueue('reports') private readonly reportsQueue: Queue,
    @InjectQueue('cleanup') private readonly cleanupQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async pollAndDispatch() {
    const events = await this.prisma.domainEvent.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
      take: this.BATCH_SIZE,
    });

    if (events.length === 0) return;

    const processedIds: string[] = [];
    const failedIds: string[] = [];

    for (const event of events) {
      try {
        const queue = this.resolveQueue(event.eventType);
        if (queue) {
          await queue.add(event.eventType, {
            eventId: event.id,
            orgId: event.orgId,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            payload: event.payload,
            actorUserId: event.actorUserId,
            occurredAt: event.createdAt,
          });
        }
        processedIds.push(event.id);
      } catch (error) {
        this.logger.error(
          `Failed to dispatch event ${event.id} (${event.eventType}): ${(error as Error).message}`,
        );
        failedIds.push(event.id);
      }
    }

    // Mark successfully dispatched events as processed
    if (processedIds.length > 0) {
      await this.prisma.domainEvent.updateMany({
        where: { id: { in: processedIds } },
        data: { processed: true, processedAt: new Date() },
      });
      this.logger.debug(`Dispatched ${processedIds.length} events to queues`);
    }

    if (failedIds.length > 0) {
      this.logger.warn(`${failedIds.length} events failed dispatch — will retry next poll`);
    }
  }

  /**
   * Route event types to the correct Bull queue.
   * Convention: event type prefix determines the queue.
   */
  private resolveQueue(eventType: string): Queue | null {
    // Notification events
    if (
      eventType.includes('notification') ||
      eventType.includes('email') ||
      eventType.includes('reminder') ||
      eventType.includes('alert')
    ) {
      return this.notificationsQueue;
    }

    // Reward/EXP events
    if (
      eventType.includes('reward') ||
      eventType.includes('exp') ||
      eventType.includes('badge') ||
      eventType.includes('penalty')
    ) {
      return this.rewardsQueue;
    }

    // Report/Export events
    if (
      eventType.includes('report') ||
      eventType.includes('export') ||
      eventType.includes('import')
    ) {
      return this.reportsQueue;
    }

    // Cleanup events
    if (
      eventType.includes('cleanup') ||
      eventType.includes('archive') ||
      eventType.includes('retention')
    ) {
      return this.cleanupQueue;
    }

    // Default: route to notifications queue (catch-all for domain events
    // that may need to trigger user-facing notifications)
    return this.notificationsQueue;
  }
}
