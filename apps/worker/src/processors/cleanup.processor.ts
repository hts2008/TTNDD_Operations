import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

/**
 * Cleanup processor — handles data retention, temp file cleanup,
 * archive operations, and background maintenance tasks.
 */
@Processor('cleanup')
export class CleanupProcessor {
  private readonly logger = new Logger(CleanupProcessor.name);

  @Process()
  async handleCleanup(job: Job) {
    const { eventType, orgId, aggregateId, payload } = job.data;

    this.logger.log(`[Cleanup] Processing: ${eventType} | org=${orgId} | aggregate=${aggregateId}`);

    // TODO: Implement cleanup logic
    // - Temp file retention/TTL enforcement
    // - Old session draft cleanup
    // - Archived entity purge
    // - Domain event table pruning (processed events > TTL)

    this.logger.debug(`[Cleanup] Completed: ${eventType} (job ${job.id})`);
  }
}
