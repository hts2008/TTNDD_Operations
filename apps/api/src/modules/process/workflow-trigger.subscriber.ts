import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkflowExecutorService } from './workflow-executor.service';

type WorkflowTriggerDomainEvent = {
  orgId: string;
  eventType: string;
  payload?: unknown;
};

@Injectable()
export class WorkflowTriggerSubscriber {
  private readonly logger = new Logger(WorkflowTriggerSubscriber.name);

  constructor(private readonly executor: WorkflowExecutorService) {}

  @OnEvent('sop.version.published')
  async onSopVersionPublished(event: WorkflowTriggerDomainEvent) {
    await this.triggerMatchingWorkflows(event);
  }

  private async triggerMatchingWorkflows(event: WorkflowTriggerDomainEvent) {
    try {
      if (!event.orgId || !event.eventType) return;
      const payload =
        event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : {};
      await this.executor.handleTriggerEvent(event.orgId, event.eventType, payload);
    } catch (error) {
      this.logger.warn(
        `Failed to trigger workflows for ${event.eventType}: ${(error as Error).message}`,
      );
    }
  }
}
