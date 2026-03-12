import { Injectable, Logger } from '@nestjs/common';
import type { ChannelAdapter, ChannelPayload, DeliveryResult } from './channel-adapter.interface';

/**
 * Firebase Cloud Messaging (FCM) Adapter — STORY-007 T-0182
 *
 * Stub implementation. Requires:
 * - FCM_PROJECT_ID: Firebase project ID
 * - GOOGLE_APPLICATION_CREDENTIALS: path to service account JSON
 *
 * When configured, uses firebase-admin SDK to send push notifications.
 */
@Injectable()
export class FcmAdapter implements ChannelAdapter {
  readonly channelName = 'fcm';
  private readonly logger = new Logger(FcmAdapter.name);

  private readonly projectId = process.env.FCM_PROJECT_ID;

  isConfigured(): boolean {
    return !!this.projectId;
  }

  async send(_orgId: string, payload: ChannelPayload): Promise<DeliveryResult> {
    if (!this.isConfigured()) {
      this.logger.warn('FCM not configured — push notification skipped');
      return {
        success: false,
        error: 'FCM_PROJECT_ID not set. Firebase push notifications disabled.',
        channel: this.channelName,
      };
    }

    const fcmToken = payload.recipientAddress;
    if (!fcmToken) {
      return {
        success: false,
        error: 'No FCM token for recipient',
        channel: this.channelName,
      };
    }

    // TODO: Implement actual FCM send via firebase-admin
    // import * as admin from 'firebase-admin';
    // const message = {
    //   notification: { title: payload.title, body: payload.body },
    //   data: { actionUrl: payload.actionUrl ?? '' },
    //   token: fcmToken,
    // };
    // const response = await admin.messaging().send(message);
    this.logger.log(`[STUB] Would send FCM push to token ${fcmToken.slice(0, 12)}...: ${payload.title}`);

    return {
      success: false,
      error: 'FCM adapter is stub — awaiting firebase-admin integration',
      channel: this.channelName,
    };
  }
}
