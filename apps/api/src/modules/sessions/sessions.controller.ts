import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { SessionsService } from './sessions.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new session' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      branchId: string; title: string; sessionDate: string; startTime?: string; endTime?: string;
      location?: string; sessionType?: string; theme?: string;
      pillarDaoDuc?: string; pillarPhuongPhap?: string; pillarGiaoDuc?: string;
      lessonPlan?: Prisma.InputJsonValue; materials?: Prisma.InputJsonValue;
    },
  ) {
    return this.sessionsService.create(user.orgId, body, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List sessions (paginated, filterable)' })
  findMany(
    @CurrentUser() user: CurrentUserPayload,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sessionsService.findMany(user.orgId, { branchId, status, from, to }, page ?? 1, limit ?? 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session detail with attendance' })
  findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.sessionsService.findById(user.orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update session (lesson plan, debrief, etc.)' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: {
      title?: string; sessionDate?: string; startTime?: string; endTime?: string;
      location?: string; theme?: string; lessonPlan?: Prisma.InputJsonValue;
      debriefNotes?: string; energyRating?: number; engagementRating?: number;
    },
  ) {
    return this.sessionsService.update(user.orgId, id, body, user.userId);
  }

  @Post(':id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition session status (SM-12)' })
  transition(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('action') action: string,
  ) {
    return this.sessionsService.transition(user.orgId, id, action, user.userId);
  }

  @Post(':id/attendance')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Mark attendance (bulk, idempotent)' })
  markAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('records') records: Array<{ memberId: string; status: string; excusedReason?: string }>,
  ) {
    return this.sessionsService.markAttendance(user.orgId, id, records, user.userId);
  }

  @Get('attendance/report/:memberId')
  @ApiOperation({ summary: 'Get attendance report for a member' })
  getAttendanceReport(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.sessionsService.getAttendanceReport(user.orgId, memberId);
  }

  // ── Annual Program (WP-3.4) ──

  @Post('annual-programs')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create annual program' })
  createAnnualProgram(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { branchId: string; year: number; title?: string; monthlyThemes?: Prisma.InputJsonValue; objectives?: Prisma.InputJsonValue },
  ) {
    return this.sessionsService.createAnnualProgram(user.orgId, body);
  }

  @Get('annual-programs')
  @ApiOperation({ summary: 'List annual programs' })
  getAnnualPrograms(
    @CurrentUser() user: CurrentUserPayload,
    @Query('branchId') branchId?: string,
    @Query('year') year?: number,
  ) {
    return this.sessionsService.getAnnualPrograms(user.orgId, { branchId, year: year ? Number(year) : undefined });
  }

  @Patch('annual-programs/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update annual program' })
  updateAnnualProgram(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { title?: string; monthlyThemes?: Prisma.InputJsonValue; objectives?: Prisma.InputJsonValue },
  ) {
    return this.sessionsService.updateAnnualProgram(user.orgId, id, body, user.userId);
  }

  @Post('annual-programs/:id/approve')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Approve annual program' })
  approveAnnualProgram(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.sessionsService.approveAnnualProgram(user.orgId, id, user.userId);
  }
}
