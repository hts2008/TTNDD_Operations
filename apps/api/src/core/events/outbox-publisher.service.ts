import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DomainEventService } from './domain-event.service';

/**
 * Outbox pattern publisher — polls unprocessed domain events and publishes
 * to external message bus (GCP Pub/Sub in PROD, log-only in DEV).
 */
@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  constructor(
    private readonly domainEvents: DomainEventService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async pollAndPublish() {
    const events = await this.domainEvents.getUnprocessedEvents(50);
    if (events.length === 0) return;

    const isProd = this.config.get('APP_ENV') === 'production';

    for (const event of events) {
      try {
        if (isProd) {
          // TODO: Publish to GCP Pub/Sub (Phase 3)
          this.logger.log(`[PubSub] Would publish: ${event.eventType}`);
        } else {
          this.logger.debug(`[DEV] Event: ${event.eventType} → ${event.aggregateType}:${event.aggregateId}`);
        }
      } catch (error) {
        this.logger.error(`Failed to publish event ${event.id}: ${(error as Error).message}`);
        continue;
      }
    }

    await this.domainEvents.markProcessed(events.map((e) => e.id));
    this.logger.debug(`Processed ${events.length} outbox events`);
  }
}
