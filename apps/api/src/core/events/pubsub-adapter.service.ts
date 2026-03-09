import { Injectable, Logger } from '@nestjs/common';
import { PubSub, Topic } from '@google-cloud/pubsub';
import { ConfigService } from '@nestjs/config';
import { MessagingAdapter, MessageEnvelope } from './messaging-adapter.interface';

/**
 * GCP Pub/Sub adapter — publishes domain events to GCP Pub/Sub topics.
 *
 * Topic naming convention:
 *   ttndd-ops-events  (single fanout topic; subscriptions filter by attr)
 *
 * Message attributes used for subscription filtering:
 *   - orgId
 *   - eventType
 *   - aggregateType
 *
 * DLQ: Failed events are published to ttndd-ops-events-dlq topic.
 */
@Injectable()
export class PubSubAdapter implements MessagingAdapter {
  readonly name = 'gcp-pubsub';
  private readonly logger = new Logger(PubSubAdapter.name);
  private readonly pubsub: PubSub;
  private readonly mainTopic: Topic;
  private readonly dlqTopic: Topic;

  constructor(private readonly config: ConfigService) {
    const projectId = this.config.get<string>('GCP_PROJECT_ID');

    this.pubsub = new PubSub({ projectId });

    const topicName = this.config.get<string>('PUBSUB_EVENTS_TOPIC', 'ttndd-ops-events');
    const dlqTopicName = this.config.get<string>('PUBSUB_DLQ_TOPIC', 'ttndd-ops-events-dlq');

    this.mainTopic = this.pubsub.topic(topicName);
    this.dlqTopic = this.pubsub.topic(dlqTopicName);

    this.logger.log(`PubSub adapter initialized: topic=${topicName}, dlq=${dlqTopicName}`);
  }

  async publish(event: MessageEnvelope): Promise<boolean> {
    try {
      const messageId = await this.mainTopic.publishMessage({
        data: Buffer.from(
          JSON.stringify({
            eventId: event.eventId,
            orgId: event.orgId,
            eventType: event.eventType,
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            payload: event.payload,
            actorUserId: event.actorUserId,
            occurredAt: event.occurredAt.toISOString(),
          }),
        ),
        attributes: {
          orgId: event.orgId,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
        },
      });

      this.logger.debug(`Published to Pub/Sub: ${event.eventType} (msg=${messageId})`);
      return true;
    } catch (error) {
      this.logger.error(
        `Pub/Sub publish failed for ${event.eventType}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async sendToDlq(event: MessageEnvelope, error: string, attempt: number): Promise<void> {
    try {
      await this.dlqTopic.publishMessage({
        data: Buffer.from(
          JSON.stringify({
            ...event,
            occurredAt: event.occurredAt.toISOString(),
            dlqReason: error,
            failedAttempt: attempt,
            sentToDlqAt: new Date().toISOString(),
          }),
        ),
        attributes: {
          orgId: event.orgId,
          eventType: event.eventType,
          dlq: 'true',
        },
      });
      this.logger.warn(
        `Event sent to DLQ: ${event.eventType} (${event.eventId}) after ${attempt} attempts`,
      );
    } catch (dlqError) {
      this.logger.error(
        `DLQ publish also failed for ${event.eventId}: ${(dlqError as Error).message}`,
      );
    }
  }
}
