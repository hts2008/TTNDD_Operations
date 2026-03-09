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
}
