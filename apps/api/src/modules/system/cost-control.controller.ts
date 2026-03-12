import {
  Controller,
  Post,
  Get,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeatureFlagService } from './feature-flag.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/** Budget notification payload from GCP Pub/Sub */
interface BudgetNotification {
  budgetDisplayName: string;
  costAmount: number;
  budgetAmount: number;
  currencyCode: string;
  alertThresholdExceeded: number; // 0.5, 0.8, 1.0, 1.2
}

/** Degradation levels mapped to budget thresholds */
type DegradationLevel = 'normal' | 'warning' | 'critical' | 'emergency';

/**
 * Cost Control Controller — T-0212
 *
 * Receives budget webhook notifications from GCP Pub/Sub
 * and triggers feature degradation via FeatureFlagService.
 */
@ApiTags('Admin — Cost Control')
@Controller('admin/cost')
export class CostControlController {
  private readonly logger = new Logger(CostControlController.name);
  private currentLevel: DegradationLevel = 'normal';
  private lastAlert: BudgetNotification | null = null;

  /** Optional modules to disable at 80% threshold */
  private readonly OPTIONAL_MODULES = [
    'module.warehouse_sync',
    'module.parent_portal',
    'feature.zalo_channel',
    'feature.fcm_channel',
    'feature.email_channel',
    'feature.pdf_export',
  ];

  /** System org ID for global flags */
  private readonly SYSTEM_ORG_ID = 'system';
  private readonly SYSTEM_USER_ID = 'cost-control-bot';

  constructor(
    private readonly featureFlags: FeatureFlagService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * POST /admin/cost/budget-webhook
   * Receives Pub/Sub push from GCP Billing Budget.
   */
  @Post('budget-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive GCP budget alert webhook' })
  @ApiResponse({ status: 200, description: 'Alert processed' })
  async handleBudgetWebhook(
    @Body() body: { message?: { data?: string } },
  ) {
    // Pub/Sub sends base64-encoded JSON in message.data
    let notification: BudgetNotification;
    try {
      const raw = body?.message?.data
        ? Buffer.from(body.message.data, 'base64').toString()
        : JSON.stringify(body);
      notification = JSON.parse(raw);
    } catch {
      this.logger.warn('Invalid budget webhook payload');
      return { status: 'ignored', reason: 'invalid_payload' };
    }

    this.lastAlert = notification;
    const threshold = notification.alertThresholdExceeded;
    const costPercent = Math.round(
      (notification.costAmount / notification.budgetAmount) * 100,
    );

    this.logger.warn(
      `Budget alert: ${costPercent}% spent (threshold ${threshold * 100}%)`,
    );

    // Determine degradation level
    let level: DegradationLevel = 'normal';
    if (threshold >= 1.2) level = 'emergency';
    else if (threshold >= 1.0) level = 'critical';
    else if (threshold >= 0.8) level = 'warning';

    if (level !== 'normal') {
      await this.applyDegradation(level);
    }

    this.eventEmitter.emit('cost.budget.alert', {
      level,
      threshold,
      costPercent,
      timestamp: new Date().toISOString(),
    });

    return { status: 'processed', level, costPercent };
  }

  /**
   * POST /admin/cost/degrade
   * Manually trigger degradation (for runbook use).
   */
  @Post('degrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually set degradation level' })
  async manualDegrade(@Body() body: { level: DegradationLevel }) {
    await this.applyDegradation(body.level);
    return { status: 'applied', level: body.level };
  }

  /**
   * POST /admin/cost/recover
   * Reset degradation to normal.
   */
  @Post('recover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recover from degradation — re-enable all modules' })
  async recover() {
    this.logger.log('Recovering from cost degradation...');

    for (const flag of this.OPTIONAL_MODULES) {
      await this.featureFlags.resetFlag(
        this.SYSTEM_ORG_ID,
        flag,
        this.SYSTEM_USER_ID,
      );
    }

    this.currentLevel = 'normal';
    this.eventEmitter.emit('cost.degradation.recovered', {
      timestamp: new Date().toISOString(),
    });

    return { status: 'recovered', level: 'normal' };
  }

  /**
   * GET /admin/cost/status
   * Current degradation status.
   */
  @Get('status')
  @ApiOperation({ summary: 'Current cost control status' })
  async getStatus() {
    return {
      level: this.currentLevel,
      lastAlert: this.lastAlert,
      timestamp: new Date().toISOString(),
    };
  }

  /** Apply degradation based on level */
  private async applyDegradation(level: DegradationLevel) {
    this.currentLevel = level;

    switch (level) {
      case 'warning':
        this.logger.warn('80% budget — disabling optional modules');
        for (const flag of this.OPTIONAL_MODULES) {
          await this.featureFlags.setFlag(
            this.SYSTEM_ORG_ID,
            flag,
            false,
            this.SYSTEM_USER_ID,
          );
        }
        break;

      case 'critical':
        this.logger.error('100% budget — critical mode');
        for (const flag of this.OPTIONAL_MODULES) {
          await this.featureFlags.setFlag(
            this.SYSTEM_ORG_ID,
            flag,
            false,
            this.SYSTEM_USER_ID,
          );
        }
        // Note: read-only enforcement requires middleware-level gate
        // Document in runbook how to manually scale down
        break;

      case 'emergency':
        this.logger.error('120% budget — EMERGENCY KILL SWITCH');
        // At this level, manual gcloud intervention is required
        // `gcloud run services update --max-instances=0`
        break;
    }

    this.eventEmitter.emit('cost.degradation.applied', {
      level,
      timestamp: new Date().toISOString(),
    });
  }
}
