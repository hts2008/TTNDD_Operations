import { Controller, Get, Post, Param, Body, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ChildSafetyService } from './child-safety.service';
import { CurrentUser, Roles } from '../../common/decorators';
import type { CurrentUserPayload } from '../../common/decorators';

@ApiTags('Child Safety')
@ApiBearerAuth()
@Controller('child-safety')
export class ChildSafetyController {
  constructor(private readonly service: ChildSafetyService) {}

  @Post('incidents')
  report(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.service.reportIncident(user.orgId, body, user.userId);
  }

  @Get('incidents')
  @Roles('super_admin', 'admin')
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findIncidents(user.orgId, user.role, page, limit);
  }

  @Get('incidents/:id')
  @Roles('super_admin', 'admin')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.getIncident(user.orgId, id, user.role);
  }

  @Post('incidents/:id/escalate')
  @Roles('super_admin', 'admin')
  escalate(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.escalateIncident(user.orgId, id, user.userId);
  }

  @Post('incidents/:id/evidence')
  @Roles('super_admin', 'admin')
  addEvidence(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() body: any) {
    return this.service.addEvidence(user.orgId, id, body, user.userId);
  }

  @Get('incidents/:id/export')
  @Roles('super_admin', 'admin')
  exportForCouncil(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.exportForCouncil(user.orgId, id, user.role);
  }

  @Get('validate-2-adult')
  validate2Adult(@Query('staffCount', ParseIntPipe) staffCount: number) {
    return { valid: this.service.validate2AdultRule(staffCount), staffCount };
  }

  @Get('quiet-hours')
  checkQuietHours() {
    return { isQuietHours: this.service.isQuietHours() };
  }

  @Post('retention-policy')
  @Roles('super_admin')
  applyRetention(@CurrentUser() user: CurrentUserPayload) {
    return this.service.applyRetentionPolicy(user.orgId);
  }
}
