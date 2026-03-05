import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database';

export interface DomainEventPayload {
  orgId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: Prisma.InputJsonValue;
  actorUserId: string;
}

@Injectable()
export class DomainEventService {
  private readonly logger = new Logger(DomainEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Publish a domain event: persist to outbox table + emit in-process.
   * Outbox pattern ensures at-least-once delivery to Pub/Sub.
   */
  async publish(event: DomainEventPayload): Promise<string> {
    const saved = await this.prisma.domainEvent.create({
      data: {
        orgId: event.orgId,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload,
        actorUserId: event.actorUserId,
      },
    });

    this.eventEmitter.emit(event.eventType, {
      id: saved.id,
      ...event,
      occurredAt: saved.createdAt,
    });

    this.logger.debug(`Event published: ${event.eventType} (${saved.id})`);
    return saved.id;
  }

  /**
   * Mark events as processed (called by OutboxPublisher after Pub/Sub delivery).
   */
  async markProcessed(eventIds: string[]): Promise<void> {
    await this.prisma.domainEvent.updateMany({
      where: { id: { in: eventIds } },
      data: { processed: true, processedAt: new Date() },
    });
  }

  /**
   * Get unprocessed events for outbox polling.
   */
  async getUnprocessedEvents(limit = 100) {
    return this.prisma.domainEvent.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }
}
