import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrmService } from './hrm.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('HRM')
@ApiBearerAuth()
@Controller('hrm')
export class HrmController {
  constructor(private readonly hrmService: HrmService) {}

  @Post('members')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new member with profile' })
  createMember(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      userId: string;
      role: string;
      branchId?: string;
      unitId?: string;
      memberCode?: string;
      scoutName?: string;
      heroName?: string;
      profile: {
        fullName: string;
        birthDate?: string;
        gender?: string;
        address?: string;
        personalPhone?: string;
        personalEmail?: string;
        guardianName?: string;
        guardianPhone?: string;
        guardianRelation?: string;
        healthNotes?: string;
        emergencyContact?: string;
      };
    },
  ) {
    return this.hrmService.createMember(user.orgId, body, user.userId);
  }

  @Get('members')
  @ApiOperation({ summary: 'List members with filters (paginated)' })
  findMany(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.hrmService.findMany(
      user.orgId,
      { status, branchId, role, search },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get('members/:id')
  @ApiOperation({ summary: 'Get member detail with profile' })
  findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.findById(user.orgId, id);
  }

  @Put('members/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update member profile' })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body()
    body: {
      fullName?: string;
      birthDate?: string;
      gender?: string;
      address?: string;
      personalPhone?: string;
      personalEmail?: string;
      guardianName?: string;
      guardianPhone?: string;
      guardianRelation?: string;
      healthNotes?: string;
      emergencyContact?: string;
    },
  ) {
    return this.hrmService.updateProfile(user.orgId, id, body, user.userId);
  }

  @Post('members/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition member status (state machine SM-1)' })
  transitionStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('action') action: string,
  ) {
    return this.hrmService.transitionStatus(user.orgId, id, action, user.userId);
  }

  @Post('members/:id/transfer')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Transfer member to different branch/unit' })
  transferMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { toBranchId: string; toUnitId?: string; reason?: string },
  ) {
    return this.hrmService.transferMember(user.orgId, id, body, user.userId);
  }

  @Get('org-chart')
  @ApiOperation({ summary: 'Get organization chart' })
  getOrgChart(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getOrgChart(user.orgId);
  }

  @Post('org-chart/nodes')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0051: Create org chart node' })
  createOrgChartNode(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      nodeType: string;
      parentNodeId?: string;
      orgMemberId?: string;
      positionTitle?: string;
      displayOrder?: number;
      validFrom?: string;
      validTo?: string;
    },
  ) {
    return this.hrmService.createOrgChartNode(user.orgId, body, user.userId);
  }

  @Put('org-chart/nodes/:nodeId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0051: Update org chart node' })
  updateOrgChartNode(
    @CurrentUser() user: CurrentUserPayload,
    @Param('nodeId') nodeId: string,
    @Body()
    body: {
      name?: string;
      nodeType?: string;
      parentNodeId?: string | null;
      orgMemberId?: string | null;
      positionTitle?: string | null;
      displayOrder?: number;
      isActive?: boolean;
      validTo?: string | null;
    },
  ) {
    return this.hrmService.updateOrgChartNode(user.orgId, nodeId, body, user.userId);
  }

  @Delete('org-chart/nodes/:nodeId')
  @Roles('super_admin')
  @ApiOperation({ summary: 'T-0051: Delete org chart node (leaf only)' })
  deleteOrgChartNode(@CurrentUser() user: CurrentUserPayload, @Param('nodeId') nodeId: string) {
    return this.hrmService.deleteOrgChartNode(user.orgId, nodeId, user.userId);
  }

  @Get('members/:id/timeline')
  @ApiOperation({ summary: 'Get member event timeline' })
  getTimeline(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.getTimeline(user.orgId, id);
  }

  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get HRM statistics' })
  getStats(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getStats(user.orgId);
  }

  @Get('members/:id/character-sheet')
  @ApiOperation({
    summary: 'T-0048: Get cross-module character sheet (profile + rewards + rank + attendance)',
  })
  getCharacterSheet(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.getCharacterSheet(user.orgId, id);
  }

  @Get('members/:id/compliance')
  @Roles('super_admin', 'admin')
  @ApiOperation({
    summary: 'T-0050: Check member compliance (guardian, medical, background check)',
  })
  checkCompliance(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.checkMemberCompliance(user.orgId, id);
  }

  // ─── T-0052: Drag/Drop Reorder APIs ──────────────────────────
  @Post('org-chart/reorder')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0052: Batch reorder org chart nodes' })
  reorderOrgChartNodes(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { items: Array<{ id: string; displayOrder: number }> },
  ) {
    return this.hrmService.reorderOrgChartNodes(user.orgId, body.items, user.userId);
  }

  @Post('org-chart/nodes/:nodeId/reparent')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0052: Move node to a new parent (drag/drop)' })
  reparentOrgChartNode(
    @CurrentUser() user: CurrentUserPayload,
    @Param('nodeId') nodeId: string,
    @Body() body: { newParentId: string | null; displayOrder: number },
  ) {
    return this.hrmService.reparentOrgChartNode(
      user.orgId,
      nodeId,
      body.newParentId,
      body.displayOrder,
      user.userId,
    );
  }

  // ─── T-0053: Unit Assignment Flows ───────────────────────────
  @Post('units/:unitId/assign')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0053: Assign member to unit' })
  assignMemberToUnit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('unitId') unitId: string,
    @Body() body: { memberId: string; roleInUnit?: string },
  ) {
    return this.hrmService.assignMemberToUnit(
      user.orgId,
      unitId,
      body.memberId,
      body.roleInUnit,
      user.userId,
    );
  }

  @Post('units/:unitId/remove')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0053: Remove member from unit' })
  removeMemberFromUnit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('unitId') unitId: string,
    @Body() body: { memberId: string },
  ) {
    return this.hrmService.removeMemberFromUnit(user.orgId, unitId, body.memberId, user.userId);
  }

  @Get('units/:unitId/members')
  @ApiOperation({ summary: 'T-0053: List members in a unit' })
  getUnitMembers(@CurrentUser() user: CurrentUserPayload, @Param('unitId') unitId: string) {
    return this.hrmService.getUnitMembers(user.orgId, unitId);
  }

  // ─── T-0054: Volunteer Availability Calendar ─────────────────
  @Post('availability')
  @ApiOperation({ summary: 'T-0054: Set volunteer availability slot' })
  setAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      date: string;
      startTime: string;
      endTime: string;
      status: string;
      notes?: string;
    },
  ) {
    return this.hrmService.setVolunteerAvailability(user.orgId, user.userId, body);
  }

  @Get('availability')
  @ApiOperation({ summary: 'T-0054: Get volunteer availability (for current user or query)' })
  getAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Query('memberId') memberId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.hrmService.getVolunteerAvailability(user.orgId, memberId ?? user.userId, from, to);
  }

  @Delete('availability/:slotId')
  @ApiOperation({ summary: 'T-0054: Delete availability slot' })
  deleteAvailability(@CurrentUser() user: CurrentUserPayload, @Param('slotId') slotId: string) {
    return this.hrmService.deleteVolunteerAvailability(user.orgId, slotId, user.userId);
  }

  // ─── T-0055: Role-Scope Enforcement ──────────────────────────
  @Get('scope-check')
  @ApiOperation({ summary: 'T-0055: Check current user role-scope permissions' })
  checkRoleScope(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.checkRoleScope(user.orgId, user.userId);
  }

  // ═══════════════════════════════════════════════════════════════
  // WP-2.4: PARENT PORTAL & CONSENT READ MODELS (T-0056 → T-0060)
  // ═══════════════════════════════════════════════════════════════

  // T-0056: Link guardian to Firebase user account
  @Post('parent/link-account')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0056: Link guardian record to user account for parent login' })
  linkParentAccount(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { guardianLinkId: string; userId: string },
  ) {
    return this.hrmService.linkParentAccount(user.orgId, body.guardianLinkId, body.userId);
  }

  // T-0056: Get children linked to current parent user
  @Get('parent/children')
  @ApiOperation({ summary: 'T-0056: Get all children linked to the current parent user' })
  getMyChildren(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getLinkedChildren(user.orgId, user.userId);
  }

  // T-0057: Parent dashboard (aggregated read model)
  @Get('parent/dashboard')
  @ApiOperation({
    summary: 'T-0057: Get parent dashboard with attendance, fees, consent for linked children',
  })
  getParentDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getParentDashboard(user.orgId, user.userId);
  }

  // T-0058: Get child data access logs (transparency for parents/admins)
  @Get('parent/child-access-logs/:childMemberId')
  @ApiOperation({ summary: 'T-0058: View who accessed child data (COPPA audit trail)' })
  getChildAccessLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Param('childMemberId') childMemberId: string,
    @Query('limit') limit?: string,
  ) {
    return this.hrmService.getChildDataAccessLogs(
      user.orgId,
      childMemberId,
      limit ? parseInt(limit) : 50,
    );
  }

  // T-0059: Get notification preferences
  @Get('notifications/preferences')
  @ApiOperation({ summary: 'T-0059: Get notification preferences for current user' })
  getNotificationPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getNotificationPreferences(user.orgId, user.userId);
  }

  // T-0059: Update notification preference
  @Put('notifications/preferences')
  @ApiOperation({ summary: 'T-0059: Update a notification channel/event preference' })
  updateNotificationPreference(
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

  // ═══════════════════════════════════════════════════════════════
  // WP-2.5: BRANCH TRANSITION & HANDOVER (T-0061 → T-0065)
  // ═══════════════════════════════════════════════════════════════

  @Get('transfers')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0061: List transfer cases' })
  getTransferCases(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('memberId') memberId?: string,
  ) {
    return this.hrmService.getTransferCases(user.orgId, { status, memberId });
  }

  @Get('transfers/:caseId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0061: Get transfer case detail' })
  getTransferCase(@CurrentUser() user: CurrentUserPayload, @Param('caseId') caseId: string) {
    return this.hrmService.getTransferCase(user.orgId, caseId);
  }

  @Post('transfers/:caseId/approve')
  @Roles('super_admin')
  @ApiOperation({ summary: 'T-0061: Approve transfer case → pending_handover' })
  approveTransfer(@CurrentUser() user: CurrentUserPayload, @Param('caseId') caseId: string) {
    return this.hrmService.approveTransfer(user.orgId, caseId, user.userId);
  }

  @Post('transfers/:caseId/handover')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0064: Complete handover with note' })
  completeHandover(
    @CurrentUser() user: CurrentUserPayload,
    @Param('caseId') caseId: string,
    @Body() body: { note: string },
  ) {
    return this.hrmService.completeHandover(user.orgId, caseId, body.note, user.userId);
  }

  @Post('transfers/:caseId/accept')
  @Roles('super_admin')
  @ApiOperation({ summary: 'T-0065: Accept transfer → execute branch move + close' })
  acceptTransfer(@CurrentUser() user: CurrentUserPayload, @Param('caseId') caseId: string) {
    return this.hrmService.acceptTransfer(user.orgId, caseId, user.userId);
  }

  @Post('transfers/:caseId/cancel')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0061: Cancel transfer case' })
  cancelTransfer(@CurrentUser() user: CurrentUserPayload, @Param('caseId') caseId: string) {
    return this.hrmService.cancelTransfer(user.orgId, caseId, user.userId);
  }

  // ═══════════════════════════════════════════════════════════════
  // WP-2.6: ONBOARDING, OFFBOARDING & COMPLIANCE OPS (T-0066 → T-0070)
  // ═══════════════════════════════════════════════════════════════

  // T-0066: Onboarding templates
  @Get('onboarding/templates')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0066: List onboarding templates' })
  getOnboardingTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getOnboardingTemplates(user.orgId);
  }

  @Post('onboarding/templates')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0066: Create onboarding template' })
  createOnboardingTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      roleType: string;
      items: Array<{ key: string; label: string; required: boolean; order: number }>;
    },
  ) {
    return this.hrmService.createOnboardingTemplate(user.orgId, body);
  }

  // T-0066: Assign onboarding to member
  @Post('onboarding/assign')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0066: Assign onboarding template to member' })
  assignOnboarding(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { memberId: string; templateId: string },
  ) {
    return this.hrmService.assignOnboarding(user.orgId, body.memberId, body.templateId);
  }

  // T-0066: Update onboarding progress
  @Post('onboarding/:progressId/complete-item')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0066: Mark onboarding checklist item as complete' })
  completeOnboardingItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('progressId') progressId: string,
    @Body() body: { itemKey: string },
  ) {
    return this.hrmService.updateOnboardingProgress(
      user.orgId,
      progressId,
      body.itemKey,
      user.userId,
    );
  }

  // T-0066: Get member onboarding status
  @Get('members/:id/onboarding')
  @ApiOperation({ summary: 'T-0066: Get member onboarding progress' })
  getMemberOnboarding(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.getMemberOnboarding(user.orgId, id);
  }

  // T-0067: Training records
  @Get('members/:id/training')
  @ApiOperation({ summary: 'T-0067: Get member training records' })
  getTrainingRecords(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.getTrainingRecords(user.orgId, id);
  }

  @Post('members/:id/training')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0067: Record training completion' })
  recordTraining(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body()
    body: {
      trainingType: string;
      trainingName: string;
      completedAt: string;
      expiresAt?: string;
      certificateUrl?: string;
      notes?: string;
    },
  ) {
    return this.hrmService.recordTraining(user.orgId, id, body, user.userId);
  }

  // T-0068: Expiring compliance report
  @Get('compliance/expiring')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0068: Get expiring background checks and training certifications' })
  getExpiringCompliance(
    @CurrentUser() user: CurrentUserPayload,
    @Query('daysAhead') daysAhead?: string,
  ) {
    return this.hrmService.getExpiringCompliance(user.orgId, daysAhead ? parseInt(daysAhead) : 30);
  }

  // T-0069: Offboarding
  @Post('members/:id/offboard')
  @Roles('super_admin')
  @ApiOperation({ summary: 'T-0069: Offboard member (archive + revoke access)' })
  offboardMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.hrmService.offboardMember(user.orgId, id, body.reason, user.userId);
  }
}
