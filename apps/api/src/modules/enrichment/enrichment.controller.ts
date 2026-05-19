import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { EnrichmentService } from './enrichment.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Enrichment')
@ApiBearerAuth()
@Controller('enrichment')
export class EnrichmentController {
  constructor(private readonly enrichmentService: EnrichmentService) {}

  // ── Spiritual Journal (only own data) ──

  @Post('spiritual-logs')
  @ApiOperation({ summary: 'Create a spiritual log entry (private to member)' })
  createSpiritualLog(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      logDate: string;
      logType?: string;
      durationMinutes?: number;
      notes?: string;
      thanhNgonRef?: string;
      emotionBefore?: number;
      emotionAfter?: number;
    },
  ) {
    const memberId = user.memberId ?? user.userId;
    return this.enrichmentService.createSpiritualLog(
      user.orgId,
      memberId,
      body,
      user.userId,
      memberId,
    );
  }

  @Get('spiritual-logs/my')
  @ApiOperation({ summary: 'Get my spiritual logs (private)' })
  getMySpiritualLogs(@CurrentUser() user: CurrentUserPayload) {
    const memberId = user.memberId ?? user.userId;
    return this.enrichmentService.findSpiritualLogsByMember(user.orgId, memberId, memberId);
  }

  // ── Ngu Gioi Self-Assessment (hidden from leaders) ──

  @Post('ngu-gioi')
  @ApiOperation({ summary: 'Create/update Ngu Gioi self-assessment (hidden from leaders)' })
  createOrUpdateNguGioi(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      weekStart: string;
      batSatSinh?: number;
      batDuDao?: number;
      batTaDam?: number;
      batTuuNhuc?: number;
      batVongNgu?: number;
      reflection?: string;
    },
  ) {
    const memberId = user.memberId ?? user.userId;
    return this.enrichmentService.createOrUpdateNguGioi(
      user.orgId,
      memberId,
      body,
      user.userId,
      memberId,
    );
  }

  @Get('ngu-gioi/my')
  @ApiOperation({ summary: 'Get my Ngu Gioi assessments (hidden from leaders)' })
  getMyNguGioi(@CurrentUser() user: CurrentUserPayload) {
    const memberId = user.memberId ?? user.userId;
    return this.enrichmentService.findNguGioiByMember(user.orgId, memberId, memberId);
  }

  // ── Evaluations (5-dimension rubric) ──

  @Post('evaluations')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a 5-dimension evaluation' })
  createEvaluation(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      orgMemberId: string;
      branchId: string;
      evaluationType?: string;
      evaluationDate: string;
      scoreDaoDuc?: number;
      scoreKyNang?: number;
      scoreTheChat?: number;
      scoreLanhDao?: number;
      scorePhungSu?: number;
      strengths?: string;
      areasToImprove?: string;
      recommendations?: string;
      selfAssessment?: Prisma.InputJsonValue;
    },
  ) {
    return this.enrichmentService.createEvaluation(
      user.orgId,
      { ...body, evaluatorId: user.userId },
      user.userId,
    );
  }

  @Get('evaluations/:memberId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get evaluations for a member' })
  getEvaluationsByMember(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.enrichmentService.findEvaluationsByMember(user.orgId, memberId);
  }

  // ── Mentoring Relationships ──

  @Post('mentoring')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a mentoring relationship' })
  createMentoringRelationship(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { mentorId: string; menteeId: string; startDate?: string },
  ) {
    return this.enrichmentService.createMentoringRelationship(user.orgId, body, user.userId);
  }

  @Get('mentoring/as-mentor')
  @ApiOperation({ summary: 'Get my mentees (as mentor)' })
  getAsMentor(@CurrentUser() user: CurrentUserPayload) {
    return this.enrichmentService.findByMentor(user.orgId, user.userId);
  }

  @Get('mentoring/as-mentee')
  @ApiOperation({ summary: 'Get my mentors (as mentee)' })
  getAsMentee(@CurrentUser() user: CurrentUserPayload) {
    return this.enrichmentService.findByMentee(user.orgId, user.userId);
  }

  // ── Mentoring Logs ──

  @Post('mentoring/:relationshipId/logs')
  @ApiOperation({ summary: 'Log a mentoring session' })
  createMentoringLog(
    @CurrentUser() user: CurrentUserPayload,
    @Param('relationshipId') relationshipId: string,
    @Body()
    body: {
      sessionDate: string;
      topic?: string;
      outcome?: string;
      followUp?: string;
    },
  ) {
    return this.enrichmentService.createMentoringLog(user.orgId, relationshipId, body);
  }

  @Get('mentoring/:relationshipId/logs')
  @ApiOperation({ summary: 'Get logs for a mentoring relationship' })
  getMentoringLogs(
    @CurrentUser() user: CurrentUserPayload,
    @Param('relationshipId') relationshipId: string,
  ) {
    return this.enrichmentService.findLogsByRelationship(user.orgId, relationshipId);
  }
}
