import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database';
import { MessagingAdapter, MessageEnvelope } from './messaging-adapter.interface';

/**
 * Local adapter — persists events and dispatches them via EventEmitter2
 * for local development. Does NOT use Pub/Sub.
 *
 * In this mode:
 * - API → DomainEventService → persist to outbox table
 * - OutboxPublisher → polls outbox → LocalAdapter.publish()
 * - LocalAdapter → EventEmitter2.emit() → NotificationEventSubscriber + other @OnEvent listeners
 *
 * DLQ: Writes failed events to domain_event_dlq table in PostgreSQL.
 */
@Injectable()
export class LocalAdapter implements MessagingAdapter {
  readonly name = 'local-dev';
  private readonly logger = new Logger(LocalAdapter.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async publish(event: MessageEnvelope): Promise<boolean> {
    // Dispatch to in-process @OnEvent listeners (NotificationEventSubscriber, etc.)
    this.eventEmitter.emit(event.eventType, {
      orgId: event.orgId,
      aggregateId: event.aggregateId,
      payload: event.payload,
    });

    this.logger.debug(
      `[LOCAL] Event dispatched: ${event.eventType} → ${event.aggregateType}:${event.aggregateId}`,
    );
    return true;
  }

  async sendToDlq(event: MessageEnvelope, error: string, attempt: number): Promise<void> {
    // Persist to DLQ table for local debugging
    try {
      await this.prisma.$executeRaw`
        INSERT INTO core.domain_event_dlq (
          event_id, org_id, event_type, aggregate_id, aggregate_type,
          payload, actor_user_id, occurred_at, error_message, attempt_count, created_at
        ) VALUES (
          ${event.eventId}, ${event.orgId}, ${event.eventType},
          ${event.aggregateId}, ${event.aggregateType},
          ${JSON.stringify(event.payload)}::jsonb,
          ${event.actorUserId}, ${event.occurredAt},
          ${error}, ${attempt}, NOW()
        )
      `;
      this.logger.warn(
        `[LOCAL DLQ] Event ${event.eventType} (${event.eventId}) after ${attempt} attempts: ${error}`,
      );
    } catch (dlqError) {
      this.logger.error(`[LOCAL DLQ] Failed to persist DLQ entry: ${(dlqError as Error).message}`);
    }
  }
}
