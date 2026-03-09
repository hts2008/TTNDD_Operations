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
}
