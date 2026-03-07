import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DomainEventService } from './domain-event.service';
import { MessagingAdapter, MessageEnvelope } from './messaging-adapter.interface';

/**
 * Outbox pattern publisher — polls unprocessed domain events and publishes
 * via the injected MessagingAdapter (GCP Pub/Sub in PROD, local passthrough in DEV).
 *
 * Retry policy:
 *   - Each event gets MAX_RETRIES attempts
 *   - After MAX_RETRIES, event goes to DLQ via adapter.sendToDlq()
 *   - Events are always marked processed to prevent infinite loops
 *
 * @see messaging-adapter.interface.ts for adapter contract
 * @see pubsub-adapter.service.ts for GCP implementation
 * @see local-adapter.service.ts for local dev implementation
 */
@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 50;
  private readonly retryCountMap = new Map<string, number>();

  constructor(
    private readonly domainEvents: DomainEventService,
    @Inject('MESSAGING_ADAPTER')
    private readonly adapter: MessagingAdapter,
  ) {
    this.logger.log(`OutboxPublisher using adapter: ${this.adapter.name}`);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async pollAndPublish() {
    const events = await this.domainEvents.getUnprocessedEvents(this.BATCH_SIZE);
    if (events.length === 0) return;

    const processedIds: string[] = [];

    for (const event of events) {
      const envelope: MessageEnvelope = {
        eventId: event.id,
        orgId: event.orgId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload,
        actorUserId: event.actorUserId || '',
        occurredAt: event.createdAt,
      };

      const retries = this.retryCountMap.get(event.id) || 0;

      try {
        const success = await this.adapter.publish(envelope);
        if (success) {
          processedIds.push(event.id);
          this.retryCountMap.delete(event.id);
        } else {
          this.handleRetry(envelope, 'Adapter returned false', retries);
        }
      } catch (error) {
        this.handleRetry(envelope, (error as Error).message, retries);
      }
    }

    if (processedIds.length > 0) {
      await this.domainEvents.markProcessed(processedIds);
      this.logger.debug(
        `Published ${processedIds.length}/${events.length} events via ${this.adapter.name}`,
      );
    }
  }

  private async handleRetry(envelope: MessageEnvelope, error: string, currentRetries: number) {
    const nextRetry = currentRetries + 1;

    if (nextRetry >= this.MAX_RETRIES) {
      // Send to DLQ and mark as processed to prevent infinite loop
      await this.adapter.sendToDlq(envelope, error, nextRetry);
      await this.domainEvents.markProcessed([envelope.eventId]);
      this.retryCountMap.delete(envelope.eventId);
      this.logger.error(
        `Event ${envelope.eventId} (${envelope.eventType}) sent to DLQ after ${nextRetry} attempts`,
      );
    } else {
      this.retryCountMap.set(envelope.eventId, nextRetry);
      this.logger.warn(
        `Event ${envelope.eventId} retry ${nextRetry}/${this.MAX_RETRIES}: ${error}`,
      );
    }
  }
}
