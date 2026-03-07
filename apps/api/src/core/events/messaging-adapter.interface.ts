/**
 * Messaging Adapter abstraction — enables swapping between
 * different message brokers (DEV=local Bull dispatch, PROD=GCP Pub/Sub).
 *
 * ADR: Event bus uses Strategy pattern to decouple outbox polling
 * from the transport mechanism. This makes the system testable
 * and deployable across environments.
 */
export interface MessageEnvelope {
  eventId: string;
  orgId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  actorUserId: string;
  occurredAt: Date;
}

export interface MessagingAdapter {
  /**
   * Publish domain event to the message broker.
   * Returns true if successful, false if should be retried.
   */
  publish(event: MessageEnvelope): Promise<boolean>;

  /**
   * Send a failed event to the dead-letter queue.
   */
  sendToDlq(event: MessageEnvelope, error: string, attempt: number): Promise<void>;

  /**
   * Get adapter name for logging.
   */
  readonly name: string;
}
