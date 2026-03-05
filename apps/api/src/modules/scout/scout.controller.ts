import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { ScoutService } from './scout.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Scout')
@ApiBearerAuth()
@Controller('scout')
export class ScoutController {
  constructor(private readonly scoutService: ScoutService) {}

  // ── Rank Definitions ──

  @Get('ranks')
  @ApiOperation({ summary: 'List rank definitions' })
  getRanks(@CurrentUser() user: CurrentUserPayload, @Query('branchId') branchId?: string) {
    return this.scoutService.getRankDefinitions(user.orgId, branchId);
  }

  @Post('ranks')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create rank definition' })
  createRank(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { branchId: string; rankCode: string; rankName: string; narrativeName?: string; rankOrder: number; description?: string; iconUrl?: string; minExp?: number },
  ) {
    return this.scoutService.createRankDefinition(user.orgId, body);
  }

  // ── Skill Groups & Skills ──

  @Get('skill-groups')
  @ApiOperation({ summary: 'List skill groups with skills (skill tree)' })
  getSkillGroups(@CurrentUser() user: CurrentUserPayload, @Query('branchId') branchId?: string) {
    return this.scoutService.getSkillGroups(user.orgId, branchId);
  }

  @Post('skill-groups')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create skill group' })
  createSkillGroup(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name: string; branchId?: string; narrativeName?: string; description?: string; icon?: string; color?: string },
  ) {
    return this.scoutService.createSkillGroup(user.orgId, body);
  }

  @Post('skills')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a skill' })
  createSkill(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { skillGroupId: string; skillCode: string; name: string; levels: Prisma.InputJsonValue; branchId?: string; rankId?: string; maxLevel?: number; isRequired?: boolean; expPerLevel?: number },
  ) {
    return this.scoutService.createSkill(user.orgId, body);
  }

  // ── Skill Progress ──

  @Get('progress/:memberId')
  @ApiOperation({ summary: 'Get skill progress for a member' })
  getProgress(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.scoutService.getSkillProgress(user.orgId, memberId);
  }

  @Post('progress/:memberId/start')
  @ApiOperation({ summary: 'Start a skill' })
  startSkill(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body('skillId') skillId: string,
  ) {
    return this.scoutService.startSkill(user.orgId, memberId, skillId);
  }

  @Post('progress/:memberId/verify')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Verify a skill level for a member' })
  verifySkill(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body() body: { skillId: string; level: number },
  ) {
    return this.scoutService.verifySkillLevel(user.orgId, memberId, body.skillId, body.level, user.userId);
  }

  // ── Rank Progress ──

  @Get('member-ranks/:memberId')
  @ApiOperation({ summary: 'Get member rank progression' })
  getMemberRanks(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.scoutService.getMemberRanks(user.orgId, memberId);
  }

  @Post('member-ranks/:memberId/start')
  @ApiOperation({ summary: 'Start working on a rank' })
  startRank(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body() body: { branchId: string; rankId: string },
  ) {
    return this.scoutService.startRank(user.orgId, memberId, body.branchId, body.rankId);
  }

  @Post('member-ranks/:memberId/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition rank status (SM-11)' })
  transitionRank(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body() body: { rankId: string; action: string },
  ) {
    return this.scoutService.transitionRank(user.orgId, memberId, body.rankId, body.action, user.userId);
  }
}
