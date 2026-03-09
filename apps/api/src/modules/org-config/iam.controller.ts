import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IamService } from './iam.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('IAM — Members & Roles')
@ApiBearerAuth()
@Controller('organizations/:orgId/members')
export class IamController {
  constructor(private readonly iamService: IamService) {}

  // ── Invite ─────────────────────────────────────────────

  @Post()
  @Roles('super_admin', 'admin', 'leader')
  @ApiOperation({ summary: 'Invite a new member to the organization' })
  inviteMember(
    @Param('orgId') orgId: string,
    @Body()
    body: {
      email: string;
      displayName?: string;
      role: string;
      branchId?: string;
      unitId?: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.iamService.inviteMember(orgId, body, user.userId, user.role);
  }

  // ── Role Change ────────────────────────────────────────

  @Patch(':memberId/role')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Change member role (with escalation guard)' })
  updateRole(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body('role') role: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.iamService.updateMemberRole(orgId, memberId, role, user.userId, user.role);
  }

  // ── Assignment ─────────────────────────────────────────

  @Patch(':memberId/assignment')
  @Roles('super_admin', 'admin', 'leader')
  @ApiOperation({ summary: 'Reassign member to different branch/unit' })
  updateAssignment(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body() body: { branchId?: string; unitId?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.iamService.updateMemberAssignment(orgId, memberId, body, user.userId);
  }

  // ── Deactivate ─────────────────────────────────────────

  @Patch(':memberId/deactivate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Deactivate a member (remain in org but inactive)' })
  deactivate(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.iamService.deactivateMember(orgId, memberId, user.userId, user.role);
  }

  // ── Reactivate ─────────────────────────────────────────

  @Patch(':memberId/reactivate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Reactivate an inactive member' })
  reactivate(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.iamService.reactivateMember(orgId, memberId, user.userId);
  }

  // ── Remove ─────────────────────────────────────────────

  @Delete(':memberId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Remove member from organization (soft-delete)' })
  remove(
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.iamService.removeMember(orgId, memberId, user.userId, user.role);
  }

  // ── Roles List ─────────────────────────────────────────

  @Get('roles')
  @ApiOperation({ summary: 'List available roles and permissions' })
  getRoles() {
    return this.iamService.getRoles();
  }
}
