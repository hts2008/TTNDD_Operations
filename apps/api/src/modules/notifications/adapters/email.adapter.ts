import { Injectable, Logger } from '@nestjs/common';
import type { ChannelAdapter, ChannelPayload, DeliveryResult } from './channel-adapter.interface';

/**
 * Email Adapter — STORY-007 T-0182
 *
 * Stub implementation. Requires:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP port (default 587)
 * - SMTP_USER: SMTP username
 * - SMTP_PASS: SMTP password
 * - SMTP_FROM: Sender email address
 *
 * Uses nodemailer when configured.
 */
@Injectable()
export class EmailAdapter implements ChannelAdapter {
  readonly channelName = 'email';
  private readonly logger = new Logger(EmailAdapter.name);

  private readonly smtpHost = process.env.SMTP_HOST;
  private readonly smtpFrom = process.env.SMTP_FROM ?? 'noreply@ttndd.org';

  isConfigured(): boolean {
    return !!this.smtpHost;
  }

  async send(_orgId: string, payload: ChannelPayload): Promise<DeliveryResult> {
    if (!this.isConfigured()) {
      this.logger.warn('SMTP not configured — email notification skipped');
      return {
        success: false,
        error: 'SMTP_HOST not set. Email notifications disabled.',
        channel: this.channelName,
      };
    }

    const recipientEmail = payload.recipientAddress;
    if (!recipientEmail) {
      return {
        success: false,
        error: 'No email address for recipient',
        channel: this.channelName,
      };
    }

    // TODO: Implement actual email sending via nodemailer
    // const transporter = nodemailer.createTransport({
    //   host: this.smtpHost,
    //   port: parseInt(process.env.SMTP_PORT ?? '587'),
    //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // });
    // await transporter.sendMail({
    //   from: this.smtpFrom,
    //   to: recipientEmail,
    //   subject: payload.title,
    //   html: `<p>${payload.body}</p>`,
    // });
    this.logger.log(`[STUB] Would send email to ${recipientEmail}: ${payload.title}`);

    return {
      success: false,
      error: 'Email adapter is stub — awaiting nodemailer integration',
      channel: this.channelName,
    };
  }
}
