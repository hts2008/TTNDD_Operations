import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HrmService } from './hrm.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import {
  CreateMemberDto,
  UpdateMemberProfileDto,
  TransitionStatusDto,
  TransferMemberDto,
  AssignUnitDto,
  SignTransferDto,
  MemberFilterDto,
} from './hrm.dto';

@ApiTags('HRM')
@ApiBearerAuth()
@Controller('hrm')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class HrmController {
  constructor(private readonly hrmService: HrmService) {}

  // ─── T-1001/T-1004: Member CRUD with validated DTOs ──────────────

  @Post('members')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new member with profile' })
  createMember(@CurrentUser() user: CurrentUserPayload, @Body() body: CreateMemberDto) {
    return this.hrmService.createMember(user.orgId, body, user.userId);
  }

  @Get('members')
  @ApiOperation({ summary: 'List members with filters (paginated)' })
  findMany(@CurrentUser() user: CurrentUserPayload, @Query() filters: MemberFilterDto) {
    const { page, limit, ...filterParams } = filters;
    return this.hrmService.findMany(user.orgId, filterParams, page ?? 1, limit ?? 20);
  }

  @Get('members/:id')
  @ApiOperation({ summary: 'Get member detail with profile' })
  findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.findById(user.orgId, id);
  }

  @Get('members/:id/privacy-export')
  @ApiOperation({ summary: 'Export personal data for data-subject access requests' })
  exportPersonalData(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.exportPersonalData(user.orgId, id, {
      userId: user.userId,
      role: user.role,
      memberId: user.memberId,
    });
  }

  @Put('members/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update member profile' })
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateMemberProfileDto,
  ) {
    return this.hrmService.updateProfile(user.orgId, id, body, user.userId);
  }

  // ─── T-1003/T-1004: Lifecycle transitions with guards ────────────

  @Post('members/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition member status (state machine SM-1)' })
  transitionStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: TransitionStatusDto,
  ) {
    return this.hrmService.transitionStatus(user.orgId, id, body.action, user.userId);
  }

  // ─── T-1008: Transfer with approval workflow ─────────────────────

  @Post('members/:id/transfer')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Transfer member to different branch/unit' })
  transferMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: TransferMemberDto,
  ) {
    return this.hrmService.transferMember(user.orgId, id, body, user.userId);
  }

  // ─── T-1007: Unit assignment ─────────────────────────────────────

  @Post('members/:id/assign-unit')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1007: Assign member to a unit within their branch' })
  assignUnit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: AssignUnitDto,
  ) {
    return this.hrmService.assignUnit(user.orgId, id, body, user.userId);
  }

  // ─── T-1006: Org chart ──────────────────────────────────────────

  @Get('org-chart')
  @ApiOperation({ summary: 'Get organization chart (flat list)' })
  getOrgChart(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getOrgChart(user.orgId);
  }

  @Get('org-chart/tree')
  @ApiOperation({ summary: 'T-1006: Get hierarchical org chart tree with member counts' })
  getOrgChartTree(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getOrgChartTree(user.orgId);
  }

  // ─── T-1009: Timeline ───────────────────────────────────────────

  @Get('members/:id/timeline')
  @ApiOperation({ summary: 'T-1009: Get member event timeline (domain events + branch history)' })
  getTimeline(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.getTimeline(user.orgId, id);
  }

  // ─── T-1010: Transfer handover signature ────────────────────────

  @Post('transfers/:transferId/sign')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1010: Sign a transfer handover record' })
  signTransfer(
    @CurrentUser() user: CurrentUserPayload,
    @Param('transferId') transferId: string,
    @Body() body: SignTransferDto,
  ) {
    return this.hrmService.signTransferHandover(user.orgId, transferId, body, user.userId);
  }

  // ─── Stats + Character Sheet + Compliance ───────────────────────

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
    summary: 'T-0050/T-1005: Check member compliance (guardian, medical, background check)',
  })
  checkCompliance(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.hrmService.checkMemberCompliance(user.orgId, id);
  }

  @Get('compliance/dashboard')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1005: Org-wide compliance dashboard' })
  getComplianceDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.hrmService.getComplianceDashboard(user.orgId);
  }
}
