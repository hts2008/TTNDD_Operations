import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuardianService, CreateGuardianDto, UpdateGuardianDto } from './guardian.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('HRM — Guardians')
@ApiBearerAuth()
@Controller('hrm/members/:memberId/guardians')
export class GuardianController {
  constructor(private readonly guardianService: GuardianService) {}

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Link a guardian to a member (T-0041)' })
  linkGuardian(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body() body: CreateGuardianDto,
  ) {
    return this.guardianService.linkGuardian(user.orgId, memberId, body, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List guardians for a member' })
  findByMember(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.guardianService.findByMember(user.orgId, memberId);
  }

  @Put(':guardianId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update a guardian link' })
  updateGuardian(
    @CurrentUser() user: CurrentUserPayload,
    @Param('guardianId') guardianId: string,
    @Body() body: UpdateGuardianDto,
  ) {
    return this.guardianService.updateGuardian(user.orgId, guardianId, body, user.userId);
  }

  @Delete(':guardianId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Remove a guardian link (T-0044: blocks if under-18 last guardian)' })
  removeGuardian(@CurrentUser() user: CurrentUserPayload, @Param('guardianId') guardianId: string) {
    return this.guardianService.removeGuardian(user.orgId, guardianId, user.userId);
  }

  @Get(':memberId/compliance')
  @ApiOperation({ summary: 'Check guardian compliance for a member (T-0044)' })
  checkCompliance(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.guardianService.validateGuardianCompliance(user.orgId, memberId);
  }
}
