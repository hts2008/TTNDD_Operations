/**
 * Channel Adapter Interface — STORY-007 WP-7.1
 *
 * Every notification channel (in-app, Zalo, FCM, email) must implement
 * this interface so the NotificationsService can dispatch through a
 * uniform abstraction.
 */

export interface DeliveryResult {
  success: boolean;
  /** External message/delivery ID from the provider */
  externalId?: string;
  /** Human-readable error when success=false */
  error?: string;
  /** Channel name for logging */
  channel: string;
}

export interface ChannelPayload {
  recipientId: string;
  /** External address: phone for Zalo/FCM token/email address */
  recipientAddress?: string;
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelAdapter {
  readonly channelName: string;

  /**
   * Send a notification through this channel.
   * Implementations MUST NOT throw — return { success: false, error } instead.
   */
  send(orgId: string, payload: ChannelPayload): Promise<DeliveryResult>;

  /**
   * Whether this adapter is currently configured and operational.
   * Called at startup and by the module-health endpoint.
   */
  isConfigured(): boolean;
}

/** Injection token for the adapter registry */
export const CHANNEL_ADAPTERS = 'CHANNEL_ADAPTERS';
