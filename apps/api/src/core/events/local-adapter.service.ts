import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database';
import { MessagingAdapter, MessageEnvelope } from './messaging-adapter.interface';

/**
 * Local adapter — persists events and logs them for local development.
 * Does NOT use Pub/Sub; the Worker's OutboxConsumer polls the DB directly.
 *
 * In this mode:
 * - API → DomainEventService → persist to outbox table
 * - Worker → OutboxConsumerService → poll outbox → Bull queues
 *
 * DLQ: Writes failed events to domain_event_dlq table in PostgreSQL.
 */
@Injectable()
export class LocalAdapter implements MessagingAdapter {
  readonly name = 'local-dev';
  private readonly logger = new Logger(LocalAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async publish(event: MessageEnvelope): Promise<boolean> {
    // In local mode, events are already persisted to the outbox table
    // by DomainEventService. Worker polls them directly.
    this.logger.debug(
      `[LOCAL] Event: ${event.eventType} → ${event.aggregateType}:${event.aggregateId}`,
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
