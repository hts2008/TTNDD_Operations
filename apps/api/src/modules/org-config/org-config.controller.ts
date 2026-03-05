import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { OrgConfigService } from './org-config.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Organization Config')
@ApiBearerAuth()
@Controller('organizations')
export class OrgConfigController {
  constructor(private readonly orgConfigService: OrgConfigService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.orgConfigService.findBySlug(slug);
  }

  @Patch(':id/settings')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update organization settings' })
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

  @Get(':id/branches')
  @ApiOperation({ summary: 'List branches in organization' })
  getBranches(@Param('id') id: string) {
    return this.orgConfigService.getBranches(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members in organization (paginated)' })
  getMembers(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orgConfigService.getMembers(id, page ?? 1, limit ?? 20);
  }
}
