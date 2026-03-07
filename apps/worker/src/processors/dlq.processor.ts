import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../core/database';

/**
 * DLQ Processor — handles dead-letter queue events.
 *
 * Events that land here have failed MAX_RETRIES times in the main
 * processing pipeline. This processor:
 *   1. Persists the failure record to domain_event_dlq table
 *   2. Logs for alerting/monitoring
 *   3. Can be extended for Slack/email alerts
 *
 * Manual replay: Admin can re-queue DLQ events via API endpoint
 * after fixing the root cause.
 */
@Processor('dlq')
export class DlqProcessor {
  private readonly logger = new Logger(DlqProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process()
  async handleDeadLetter(job: Job) {
    const {
      eventId,
      orgId,
      eventType,
      aggregateId,
      aggregateType,
      payload,
      actorUserId,
      occurredAt,
      error,
      attemptCount,
    } = job.data;

    this.logger.error(
      `☠️ [DLQ] Event: ${eventType} | id=${eventId} | org=${orgId} | ` +
        `attempts=${attemptCount} | error=${error}`,
    );

    // Persist to DLQ table for auditing and manual replay
    try {
      await this.prisma.$executeRaw`
        INSERT INTO core.domain_event_dlq (
          event_id, org_id, event_type, aggregate_id, aggregate_type,
          payload, actor_user_id, occurred_at, error_message, attempt_count, created_at
        ) VALUES (
          ${eventId}, ${orgId}, ${eventType}, ${aggregateId}, ${aggregateType},
          ${JSON.stringify(payload)}::jsonb,
          ${actorUserId}, ${new Date(occurredAt)},
          ${error}, ${attemptCount}, NOW()
        )
        ON CONFLICT (event_id) DO UPDATE SET
          error_message = EXCLUDED.error_message,
          attempt_count = EXCLUDED.attempt_count,
          created_at = NOW()
      `;
    } catch (dbError) {
      this.logger.error(
        `Failed to persist DLQ record for ${eventId}: ${(dbError as Error).message}`,
      );
    }

    // TODO: Send alert to monitoring (Slack, PagerDuty, etc.)
  }
}
