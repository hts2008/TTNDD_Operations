import { Injectable, Logger } from '@nestjs/common';
import type { ChannelAdapter, ChannelPayload, DeliveryResult } from './channel-adapter.interface';

/**
 * In-App adapter — the default channel.
 * Notifications are persisted to DB by NotificationsService.send(),
 * so this adapter just confirms delivery.
 */
@Injectable()
export class InAppAdapter implements ChannelAdapter {
  readonly channelName = 'in_app';
  private readonly logger = new Logger(InAppAdapter.name);

  isConfigured(): boolean {
    return true; // always available
  }

  async send(_orgId: string, payload: ChannelPayload): Promise<DeliveryResult> {
    this.logger.debug(`In-app notification → ${payload.recipientId}: ${payload.title}`);
    return { success: true, channel: this.channelName };
  }
}
