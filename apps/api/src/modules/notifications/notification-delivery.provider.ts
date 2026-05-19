export interface NotificationDeliveryPayload {
  notificationId: string;
  orgId: string;
  recipientId: string;
  title: string;
  body: string;
  type: string;
  channel: string;
  actionUrl?: string | null;
  metadata?: unknown;
}

export interface NotificationDeliveryResult {
  status: 'delivered' | 'failed' | 'skipped';
  error?: string;
  providerMessageId?: string;
  sentAt?: Date;
}

export interface NotificationDeliveryProvider {
  readonly channel: string;
  deliver(payload: NotificationDeliveryPayload): Promise<NotificationDeliveryResult>;
}

export class InAppNotificationDeliveryProvider implements NotificationDeliveryProvider {
  readonly channel = 'in_app';

  async deliver(): Promise<NotificationDeliveryResult> {
    return { status: 'delivered', sentAt: new Date() };
  }
}

export class UnconfiguredNotificationDeliveryProvider implements NotificationDeliveryProvider {
  constructor(readonly channel: string) {}

  async deliver(): Promise<NotificationDeliveryResult> {
    return {
      status: 'skipped',
      error: `provider_unconfigured:${this.channel}`,
    };
  }
}
