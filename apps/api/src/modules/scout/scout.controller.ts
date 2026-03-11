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

  // ── Program Versions ──

  @Get('program-versions')
  @ApiOperation({ summary: 'List program versions' })
  getProgramVersions(@CurrentUser() user: CurrentUserPayload) {
    return this.scoutService.getProgramVersions(user.orgId);
  }

  @Post('program-versions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create program version' })
  createProgramVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { versionName: string; status?: string; effectiveFrom?: Date; effectiveTo?: Date; notes?: string },
  ) {
    return this.scoutService.createProgramVersion(user.orgId, body);
  }

  // ── Domains ──

  @Get('domains')
  @ApiOperation({ summary: 'List domains (SPICES-tagged)' })
  getDomains(@CurrentUser() user: CurrentUserPayload, @Query('versionId') versionId?: string) {
    return this.scoutService.getDomains(user.orgId, versionId);
  }

  @Post('domains')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create domain' })
  createDomain(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { code: string; name: string; versionId?: string; branchId?: string; description?: string; spicesTags?: string[]; orderIndex?: number },
  ) {
    return this.scoutService.createDomain(user.orgId, body);
  }

  // ── Skill Criteria ──

  @Get('skills/:skillId/criteria')
  @ApiOperation({ summary: 'List criteria for a skill' })
  getSkillCriteria(@CurrentUser() user: CurrentUserPayload, @Param('skillId') skillId: string) {
    return this.scoutService.getSkillCriteria(user.orgId, skillId);
  }

  @Post('skills/:skillId/criteria')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create skill criteria' })
  createSkillCriteria(
    @CurrentUser() user: CurrentUserPayload,
    @Param('skillId') skillId: string,
    @Body() body: { metricType: string; text: string; targetValue?: string; unit?: string; orderIndex?: number },
  ) {
    return this.scoutService.createSkillCriteria(user.orgId, { skillId, ...body });
  }

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
  @ApiOperation({ summary: 'Verify a skill level for a member (legacy)' })
  verifySkill(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Body() body: { skillId: string; level: number },
  ) {
    return this.scoutService.verifySkillLevel(user.orgId, memberId, body.skillId, body.level, user.userId);
  }

  // ── Evidence Submission & Verification (WP-3.2) ──

  @Post('progress/:progressId/evidence')
  @ApiOperation({ summary: 'Submit evidence for skill progress' })
  submitEvidence(
    @CurrentUser() user: CurrentUserPayload,
    @Param('progressId') progressId: string,
    @Body() body: { fileObjectId?: string; url?: string; note?: string },
  ) {
    return this.scoutService.submitEvidence(user.orgId, progressId, body, user.userId);
  }

  @Get('verify-queue')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get pending verification queue' })
  getVerifyQueue(@CurrentUser() user: CurrentUserPayload) {
    return this.scoutService.getVerifyQueue(user.orgId);
  }

  @Post('progress/:progressId/verify-decision')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Approve or reject submitted evidence' })
  verifyProgress(
    @CurrentUser() user: CurrentUserPayload,
    @Param('progressId') progressId: string,
    @Body() body: { decision: 'approved' | 'rejected'; comment?: string },
  ) {
    return this.scoutService.verifyProgress(user.orgId, progressId, user.userId, body.decision, body.comment);
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

  // ── Habit Tracking (WP-3.3, T-0081) ──

  @Get('habits')
  @ApiOperation({ summary: 'List active habits' })
  getHabits(@CurrentUser() user: CurrentUserPayload) {
    return this.scoutService.getHabits(user.orgId);
  }

  @Post('habits')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create habit definition' })
  createHabit(@CurrentUser() user: CurrentUserPayload, @Body() body: { key: string; name: string; cadence: string }) {
    return this.scoutService.createHabit(user.orgId, body);
  }

  @Post('habits/:habitDefId/log')
  @ApiOperation({ summary: 'Log a habit check-in' })
  logHabit(
    @CurrentUser() user: CurrentUserPayload,
    @Param('habitDefId') habitDefId: string,
    @Body() body: { personId: string; logDate: string; status: string; note?: string },
  ) {
    return this.scoutService.logHabit(user.orgId, body.personId, habitDefId, body.logDate, body.status, body.note);
  }

  @Get('habits/:personId/logs')
  @ApiOperation({ summary: 'Get habit logs for a person' })
  getHabitLogs(@CurrentUser() user: CurrentUserPayload, @Param('personId') personId: string, @Query('habitDefId') habitDefId?: string) {
    return this.scoutService.getHabitLogs(user.orgId, personId, habitDefId);
  }

  @Get('habits/:personId/streak/:habitDefId')
  @ApiOperation({ summary: 'Get current streak for a habit' })
  getStreak(@CurrentUser() user: CurrentUserPayload, @Param('personId') personId: string, @Param('habitDefId') habitDefId: string) {
    return this.scoutService.getStreak(user.orgId, personId, habitDefId);
  }

  // ── Achievements (WP-3.3, T-0082) ──

  @Get('achievements')
  @ApiOperation({ summary: 'List achievement definitions' })
  getAchievements(@CurrentUser() user: CurrentUserPayload) {
    return this.scoutService.getAchievements(user.orgId);
  }

  @Post('achievements')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create achievement' })
  createAchievement(@CurrentUser() user: CurrentUserPayload, @Body() body: { key: string; name: string; description?: string; rarity?: string }) {
    return this.scoutService.createAchievement(user.orgId, body);
  }

  @Post('achievements/:achievementDefId/award')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Award achievement to a member' })
  awardAchievement(
    @CurrentUser() user: CurrentUserPayload,
    @Param('achievementDefId') achievementDefId: string,
    @Body() body: { personId: string; sourceEventId?: string },
  ) {
    return this.scoutService.awardAchievement(user.orgId, body.personId, achievementDefId, user.userId, body.sourceEventId);
  }

  @Get('achievements/:personId/awards')
  @ApiOperation({ summary: 'Get member achievements' })
  getMemberAwards(@CurrentUser() user: CurrentUserPayload, @Param('personId') personId: string) {
    return this.scoutService.getMemberAwards(user.orgId, personId);
  }

  // ── Activity & Service Log (WP-3.3, T-0085) ──

  @Post('activities')
  @ApiOperation({ summary: 'Log an activity' })
  logActivity(@CurrentUser() user: CurrentUserPayload, @Body() body: { personId: string; activityType: string; hours?: number; location?: string; note?: string }) {
    return this.scoutService.logActivity(user.orgId, body);
  }

  @Get('activities/:personId')
  @ApiOperation({ summary: 'Get activity logs for a person' })
  getActivityLogs(@CurrentUser() user: CurrentUserPayload, @Param('personId') personId: string) {
    return this.scoutService.getActivityLogs(user.orgId, personId);
  }

  @Get('activities/:personId/service-hours')
  @ApiOperation({ summary: 'Get total service hours' })
  getServiceHours(@CurrentUser() user: CurrentUserPayload, @Param('personId') personId: string) {
    return this.scoutService.getServiceHours(user.orgId, personId);
  }

  // ── Dashboards (WP-3.3, T-0083/T-0084) ──

  @Get('dashboard/:memberId')
  @ApiOperation({ summary: 'Personal progress dashboard' })
  getPersonalDashboard(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.scoutService.getPersonalDashboard(user.orgId, memberId);
  }

  @Get('leader-dashboard')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Leader aggregate dashboard' })
  getLeaderDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.scoutService.getLeaderDashboard(user.orgId);
  }
}
