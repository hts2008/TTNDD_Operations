import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrmService } from './hrm.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

/**
 * Parent Portal Controller — WP-2.4 (T-0056 → T-0060)
 *
 * Exposes parent-specific APIs:
 * - T-0056: Link parent account + get linked children
 * - T-0057: Parent dashboard (aggregate child data)
 * - T-0058: Child data access logs (COPPA audit)
 * - T-0059: Notification preferences
 * - T-0060: Privacy masking (applied automatically in dashboard)
 */
@ApiTags('Parent Portal')
@ApiBearerAuth()
@Controller('parent')
export class ParentPortalController {
  constructor(private readonly hrmService: HrmService) {}

  // ── T-0056: Link parent account ─────────────────────────

  @Post('link/:guardianLinkId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0056: Link a parent user account to a GuardianLink' })
  linkParent(
    @CurrentUser() user: CurrentUserPayload,
    @Param('guardianLinkId') guardianLinkId: string,
    @Body() body: { userId: string },
  ) {
    return this.hrmService.linkParentAccount(user.orgId, guardianLinkId, body.userId);
  }

  // ── T-0056: Get linked children ─────────────────────────

  @Get('children')
  @ApiOperation({ summary: 'T-0056: Get children linked to the authenticated parent' })
  getChildren(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getLinkedChildren(user.orgId, user.userId);
  }

  // ── T-0057: Parent dashboard ─────────────────────────

  @Get('dashboard')
  @ApiOperation({
    summary:
      'T-0057: Parent dashboard — aggregated child data (progress, attendance, fees, consent)',
  })
  getDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getParentDashboard(user.orgId, user.userId);
  }

  // ── T-0058: Child data access logs ─────────────────────────

  @Get('children/:childId/access-logs')
  @ApiOperation({ summary: 'T-0058: Get child data access logs (COPPA audit)' })
  getAccessLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Param('childId') childId: string,
    @Query('limit') limit?: string,
  ) {
    return this.hrmService.getChildDataAccessLogs(
      user.orgId,
      childId,
      limit ? parseInt(limit) : 50,
    );
  }

  // ── T-0059: Notification preferences ─────────────────────────

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'T-0059: Get parent notification preferences' })
  getNotificationPrefs(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getNotificationPreferences(user.orgId, user.userId);
  }

  @Put('notifications/preferences')
  @ApiOperation({ summary: 'T-0059: Update parent notification preference' })
  updateNotificationPrefs(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      channel: string;
      eventType: string;
      enabled: boolean;
      quietStart?: string;
      quietEnd?: string;
    },
  ) {
    return this.hrmService.updateNotificationPreference(user.orgId, user.userId, body);
  }
}
