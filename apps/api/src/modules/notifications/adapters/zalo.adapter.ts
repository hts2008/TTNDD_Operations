import { Injectable, Logger } from '@nestjs/common';
import type { ChannelAdapter, ChannelPayload, DeliveryResult } from './channel-adapter.interface';

/**
 * Zalo OA / ZNS Adapter — STORY-007 T-0182
 *
 * Stub implementation. Actual Zalo API integration requires:
 * - ZALO_OA_ID: Official Account ID
 * - ZALO_OA_SECRET: OA secret key
 * - ZALO_ZNS_TEMPLATE_TOKEN: ZNS template token
 *
 * When credentials are available, this adapter will:
 * 1. Look up recipient's Zalo user ID from profile
 * 2. Use ZNS API to send templated messages
 * 3. Fall back to OA message API for non-template messages
 */
@Injectable()
export class ZaloAdapter implements ChannelAdapter {
  readonly channelName = 'zalo';
  private readonly logger = new Logger(ZaloAdapter.name);

  private readonly oaId = process.env.ZALO_OA_ID;
  private readonly oaSecret = process.env.ZALO_OA_SECRET;

  isConfigured(): boolean {
    return !!(this.oaId && this.oaSecret);
  }

  async send(_orgId: string, payload: ChannelPayload): Promise<DeliveryResult> {
    if (!this.isConfigured()) {
      this.logger.warn('Zalo OA credentials not configured — notification skipped');
      return {
        success: false,
        error: 'Zalo OA credentials not configured. Set ZALO_OA_ID and ZALO_OA_SECRET.',
        channel: this.channelName,
      };
    }

    // TODO: Implement actual Zalo ZNS/OA API call
    // 1. POST https://openapi.zalo.me/v3.0/oa/message/cs
    // 2. Headers: { access_token: <OA_ACCESS_TOKEN> }
    // 3. Body: { recipient: { user_id }, message: { text } }
    this.logger.log(`[STUB] Would send Zalo notification to ${payload.recipientAddress ?? payload.recipientId}: ${payload.title}`);

    return {
      success: false,
      error: 'Zalo adapter is stub — awaiting OA credentials from Trưởng',
      channel: this.channelName,
    };
  }
}
