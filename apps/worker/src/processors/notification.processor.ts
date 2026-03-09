import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

/**
 * Notification processor — handles email, push, in-app notification jobs.
 * Also serves as catch-all for domain events that don't match other queues.
 */
@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process()
  async handleNotification(job: Job) {
    const { eventType, orgId, aggregateId, payload } = job.data;

    this.logger.log(
      `[Notification] Processing: ${eventType} | org=${orgId} | aggregate=${aggregateId}`,
    );

    // TODO: Implement notification dispatch logic
    // - In-app notifications (Socket.IO push via apps/api)
    // - Email notifications (SendGrid/GCP)
    // - Push notifications (Firebase Cloud Messaging)
    // - Quiet hours enforcement

    this.logger.debug(`[Notification] Completed: ${eventType} (job ${job.id})`);
  }
}
