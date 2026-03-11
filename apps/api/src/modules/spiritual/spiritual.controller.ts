import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SpiritualService } from './spiritual.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Spiritual')
@ApiBearerAuth()
@Controller('spiritual')
export class SpiritualController {
  constructor(private readonly spiritualService: SpiritualService) {}

  // ── Spiritual Log ──

  @Post('logs')
  @ApiOperation({ summary: 'Create spiritual log entry' })
  createLog(@CurrentUser() user: CurrentUserPayload, @Body() body: {
    orgMemberId: string; logDate: string; logType?: string; durationMinutes?: number;
    notes?: string; thanhNgonRef?: string; emotionBefore?: number; emotionAfter?: number;
  }) {
    return this.spiritualService.createSpiritualLog(user.orgId, body);
  }

  @Get('logs/:memberId')
  @ApiOperation({ summary: 'Get spiritual logs for a member' })
  getLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
    @Query('logType') logType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.spiritualService.getSpiritualLogs(user.orgId, memberId, { logType, from, to });
  }

  @Get('logs/:memberId/stats')
  @ApiOperation({ summary: 'Get spiritual practice statistics' })
  getStats(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.spiritualService.getSpiritualStats(user.orgId, memberId);
  }

  // ── Ngũ Giới Assessment ──

  @Post('ngu-gioi')
  @ApiOperation({ summary: 'Submit weekly Ngũ Giới self-assessment' })
  submitNguGioi(@CurrentUser() user: CurrentUserPayload, @Body() body: {
    orgMemberId: string; weekStart: string;
    batSatSinh?: number; batDuDao?: number; batTaDam?: number; batTuuNhuc?: number; batVongNgu?: number;
    reflection?: string;
  }) {
    return this.spiritualService.createNguGioiAssessment(user.orgId, body);
  }

  @Get('ngu-gioi/:memberId')
  @ApiOperation({ summary: 'Get Ngũ Giới assessment history' })
  getNguGioiHistory(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.spiritualService.getNguGioiAssessments(user.orgId, memberId);
  }

  @Get('ngu-gioi/:memberId/latest')
  @ApiOperation({ summary: 'Get latest Ngũ Giới assessment' })
  getLatestNguGioi(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.spiritualService.getLatestNguGioi(user.orgId, memberId);
  }

  // ── Evaluations ──

  @Post('evaluations')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create evaluation' })
  createEvaluation(@CurrentUser() user: CurrentUserPayload, @Body() body: {
    orgMemberId: string; evaluatorId: string; branchId: string; evaluationType?: string;
    scoreDaoDuc?: number; scoreKyNang?: number; scoreTheChat?: number;
    scoreLanhDao?: number; scorePhungSu?: number;
    strengths?: string; areasToImprove?: string; recommendations?: string;
    evaluationDate: string;
  }) {
    return this.spiritualService.createEvaluation(user.orgId, body);
  }

  @Get('evaluations/:memberId')
  @ApiOperation({ summary: 'Get evaluations for a member' })
  getEvaluations(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.spiritualService.getEvaluations(user.orgId, memberId);
  }

  @Post('evaluations/:evaluationId/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition evaluation status (SM-14)' })
  transitionEvaluation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('evaluationId') evaluationId: string,
    @Body() body: { action: string },
  ) {
    return this.spiritualService.transitionEvaluation(user.orgId, evaluationId, body.action, user.userId);
  }

  // ── Mentoring ──

  @Post('mentoring/relationships')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create mentoring relationship' })
  createRelationship(@CurrentUser() user: CurrentUserPayload, @Body() body: {
    mentorId: string; menteeId: string; startDate?: string;
  }) {
    return this.spiritualService.createMentoringRelationship(user.orgId, body);
  }

  @Get('mentoring/relationships/:personId')
  @ApiOperation({ summary: 'Get mentoring relationships' })
  getRelationships(
    @CurrentUser() user: CurrentUserPayload,
    @Param('personId') personId: string,
    @Query('role') role: 'mentor' | 'mentee' = 'mentor',
  ) {
    return this.spiritualService.getMentoringRelationships(user.orgId, personId, role);
  }

  @Patch('mentoring/relationships/:id/end')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'End a mentoring relationship' })
  endRelationship(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.spiritualService.endMentoringRelationship(user.orgId, id);
  }

  @Post('mentoring/logs')
  @ApiOperation({ summary: 'Log a mentoring session' })
  createLog2(@CurrentUser() user: CurrentUserPayload, @Body() body: {
    relationshipId: string; sessionDate: string; topic?: string; outcome?: string; followUp?: string;
  }) {
    return this.spiritualService.createMentoringLog(user.orgId, body);
  }

  @Get('mentoring/logs/:relationshipId')
  @ApiOperation({ summary: 'Get mentoring session logs' })
  getMentoringLogs(@CurrentUser() user: CurrentUserPayload, @Param('relationshipId') relationshipId: string) {
    return this.spiritualService.getMentoringLogs(user.orgId, relationshipId);
  }
}
