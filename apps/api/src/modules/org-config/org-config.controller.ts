import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { OrgConfigService } from './org-config.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Organization Config')
@ApiBearerAuth()
@Controller('organizations')
export class OrgConfigController {
  constructor(private readonly orgConfigService: OrgConfigService) {}

  // ── Organization ──

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new organization' })
  createOrganization(
    @Body() body: { slug: string; name: string; fullName?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.createOrganization(body, user.userId);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.orgConfigService.findBySlug(slug);
  }

  @Patch(':id/info')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update organization info (name, logo)' })
  updateInfo(
    @Param('id') id: string,
    @Body() body: { name?: string; fullName?: string; logoUrl?: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.updateInfo(id, body, user.userId);
  }

  @Patch(':id/settings')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update organization settings (JSONB)' })
  updateSettings(
    @Param('id') id: string,
    @Body() settings: Prisma.InputJsonValue,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.updateSettings(id, settings, user.userId);
  }

  @Patch(':id/modules/:moduleName')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Toggle a module on/off' })
  toggleModule(
    @Param('id') id: string,
    @Param('moduleName') moduleName: string,
    @Body('enabled') enabled: boolean,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.toggleModule(id, moduleName, enabled, user.userId);
  }

  // ── Branches ──

  @Get(':id/branches')
  @ApiOperation({ summary: 'List branches' })
  getBranches(@Param('id') id: string) {
    return this.orgConfigService.getBranches(id);
  }

  @Post(':id/branches')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new branch' })
  createBranch(
    @Param('id') id: string,
    @Body()
    body: {
      code: string;
      name: string;
      minAge?: number;
      maxAge?: number;
      colorTheme?: string;
      narrativeName?: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.createBranch(id, body, user.userId);
  }

  @Patch(':id/branches/:branchId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update a branch' })
  updateBranch(
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @Body()
    body: {
      name?: string;
      minAge?: number;
      maxAge?: number;
      colorTheme?: string;
      narrativeName?: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.updateBranch(id, branchId, body, user.userId);
  }

  @Delete(':id/branches/:branchId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Delete a branch (must have no active members)' })
  deleteBranch(
    @Param('id') id: string,
    @Param('branchId') branchId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.deleteBranch(id, branchId, user.userId);
  }

  // ── Units ──

  @Get(':id/units')
  @ApiOperation({ summary: 'List units (optionally by branch)' })
  getUnits(@Param('id') id: string, @Query('branchId') branchId?: string) {
    return this.orgConfigService.getUnits(id, branchId);
  }

  @Post(':id/units')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new unit' })
  createUnit(
    @Param('id') id: string,
    @Body()
    body: {
      branchId: string;
      name: string;
      totemName?: string;
      unitType?: string;
      parentUnitId?: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.createUnit(id, body, user.userId);
  }

  @Patch(':id/units/:unitId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update a unit' })
  updateUnit(
    @Param('id') id: string,
    @Param('unitId') unitId: string,
    @Body()
    body: {
      name?: string;
      totemName?: string;
      unitType?: string;
      parentUnitId?: string;
      leaderUserId?: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.updateUnit(id, unitId, body, user.userId);
  }

  @Delete(':id/units/:unitId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Delete a unit (must have no active members or children)' })
  deleteUnit(
    @Param('id') id: string,
    @Param('unitId') unitId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.orgConfigService.deleteUnit(id, unitId, user.userId);
  }

  // ── Members ──

  @Get(':id/members')
  @ApiOperation({ summary: 'List members (paginated)' })
  getMembers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orgConfigService.getMembers(id, page ?? 1, limit ?? 20);
  }

  // ── Audit ──

  @Get(':id/audit-log')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'View audit log' })
  getAuditLog(
    @Param('id') id: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orgConfigService.getAuditLog(
      id,
      { action, resource, from, to },
      page ?? 1,
      limit ?? 50,
    );
  }
}
