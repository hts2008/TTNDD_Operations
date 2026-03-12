import { Controller, Get, Param, Query, Res, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { DashboardsService } from './dashboards.service';
import { ExportService } from './export.service';
import { ActivityTimelineService } from './activity-timeline.service';
import { PdfExportService } from './pdf-export.service';
import { GlobalSearchService } from './global-search.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

type ExportResource = 'members' | 'attendance' | 'finance' | 'skills';

const EXPORT_COLUMNS: Record<ExportResource, { key: string; header: string }[]> = {
  members: [
    { key: 'memberCode', header: 'Member Code' },
    { key: 'scoutName', header: 'Scout Name' },
    { key: 'role', header: 'Role' },
    { key: 'branchId', header: 'Branch' },
    { key: 'status', header: 'Status' },
    { key: 'joinedDate', header: 'Joined Date' },
  ],
  attendance: [
    { key: 'sessionTitle', header: 'Session' },
    { key: 'date', header: 'Date' },
    { key: 'totalMembers', header: 'Total Members' },
    { key: 'present', header: 'Present' },
    { key: 'rate', header: 'Attendance %' },
  ],
  finance: [
    { key: 'category', header: 'Category' },
    { key: 'income', header: 'Income' },
    { key: 'expense', header: 'Expense' },
  ],
  skills: [
    { key: 'skillName', header: 'Skill' },
    { key: 'currentLevel', header: 'Current Level' },
    { key: 'maxLevel', header: 'Max Level' },
    { key: 'completed', header: 'Completed' },
  ],
};

@ApiTags('Dashboards')
@ApiBearerAuth()
@Controller('dashboards')
export class DashboardsController {
  constructor(
    private readonly dashboardsService: DashboardsService,
    private readonly exportService: ExportService,
    private readonly timelineService: ActivityTimelineService,
    private readonly pdfService: PdfExportService,
    private readonly searchService: GlobalSearchService,
  ) {}

  // ── Global Search (T-0186) ──

  @Get('search')
  @ApiOperation({ summary: 'Global search across all entity types' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiQuery({ name: 'types', required: false, description: 'Comma-separated entity types' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  globalSearch(
    @CurrentUser() user: CurrentUserPayload,
    @Query('q') q: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search(user.orgId, q, {
      types: types ? types.split(',') : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('org')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get org-wide dashboard (all modules summary)' })
  getOrgDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardsService.getOrgDashboard(user.orgId);
  }

  @Get('spices')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get SPICES / Tam Trụ coverage analysis' })
  getSpicesDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardsService.getSpicesDashboard(user.orgId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get personal dashboard for current user' })
  getMyDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardsService.getMyDashboard(user.orgId, user.memberId ?? user.userId);
  }

  @Get('members/:memberId/report')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get comprehensive member progress report' })
  getMemberReport(
    @CurrentUser() user: CurrentUserPayload,
    @Param('memberId') memberId: string,
  ) {
    return this.dashboardsService.getMemberReport(user.orgId, memberId);
  }

  @Get('finance')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get finance report with trends' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getFinanceReport(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardsService.getFinanceReport(user.orgId, { from, to });
  }

  @Get('attendance')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get attendance analytics' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  getAttendanceAnalytics(
    @CurrentUser() user: CurrentUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.dashboardsService.getAttendanceAnalytics(user.orgId, { from, to, branchId });
  }

  @Get('export/csv')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export data as CSV' })
  @ApiQuery({ name: 'resource', enum: ['members', 'attendance', 'finance', 'skills'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportCsv(
    @CurrentUser() user: CurrentUserPayload,
    @Query('resource') resource: ExportResource,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const data = await this.getExportData(user.orgId, resource, { from, to });
    const columns = EXPORT_COLUMNS[resource] ?? EXPORT_COLUMNS.members;
    const buffer = this.exportService.exportCSV(data, columns, `${resource}.csv`);

    res!.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res!.setHeader('Content-Disposition', `attachment; filename="${resource}_export.csv"`);
    res!.send(buffer);
  }

  @Get('export/excel')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export data as Excel (TSV)' })
  @ApiQuery({ name: 'resource', enum: ['members', 'attendance', 'finance', 'skills'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportExcel(
    @CurrentUser() user: CurrentUserPayload,
    @Query('resource') resource: ExportResource,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const data = await this.getExportData(user.orgId, resource, { from, to });
    const columns = EXPORT_COLUMNS[resource] ?? EXPORT_COLUMNS.members;
    const buffer = this.exportService.exportExcel(data, columns, `${resource}.xlsx`);

    res!.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res!.setHeader('Content-Disposition', `attachment; filename="${resource}_export.xls"`);
    res!.send(buffer);
  }

  @Get('timeline')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Activity timeline (aggregated audit + domain events)' })
  @ApiQuery({ name: 'module', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getTimeline(
    @CurrentUser() user: CurrentUserPayload,
    @Query('module') module?: string,
    @Query('actorId') actorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.timelineService.getTimeline({
      orgId: user.orgId,
      module,
      actorId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('export/pdf')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export data as PDF report' })
  @ApiQuery({ name: 'resource', enum: ['members', 'attendance', 'finance', 'skills'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportPdf(
    @CurrentUser() user: CurrentUserPayload,
    @Query('resource') resource: ExportResource,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const data = await this.getExportData(user.orgId, resource, { from, to });
    const columns = EXPORT_COLUMNS[resource] ?? EXPORT_COLUMNS.members;
    const buffer = await this.pdfService.generateReport({
      orgName: user.orgId,
      reportTitle: `${resource} Report`,
      generatedAt: new Date(),
      data,
      columns: columns.map((c) => c.key),
    });

    res!.setHeader('Content-Type', 'application/pdf');
    res!.setHeader('Content-Disposition', `attachment; filename="${resource}_report.pdf"`);
    res!.send(buffer);
  }

  @Get('reports/:reportId/download')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Download report with TTL-signed token' })
  downloadReport(
    @Param('reportId') reportId: string,
    @Query('token') token: string,
  ) {
    const { valid } = this.pdfService.validateToken(token);
    if (!valid) {
      throw new ForbiddenException('Download link has expired or is invalid');
    }
    return { reportId, status: 'ready', message: 'Report download validated' };
  }

  private async getExportData(
    orgId: string,
    resource: ExportResource,
    filters: { from?: string; to?: string },
  ): Promise<Record<string, unknown>[]> {
    switch (resource) {
      case 'members': {
        const members = await this.dashboardsService['prisma'].orgMember.findMany({
          where: { orgId },
          select: {
            memberCode: true, scoutName: true, role: true,
            branchId: true, status: true, joinedDate: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        return members as Record<string, unknown>[];
      }
      case 'attendance': {
        const analytics = await this.dashboardsService.getAttendanceAnalytics(orgId, filters);
        return analytics.bySession as Record<string, unknown>[];
      }
      case 'finance': {
        const report = await this.dashboardsService.getFinanceReport(orgId, filters);
        return Object.entries(report.byCategory).map(([category, vals]) => ({
          category,
          income: vals.income,
          expense: vals.expense,
        }));
      }
      case 'skills': {
        const skills = await this.dashboardsService['prisma'].memberSkillProgress.findMany({
          where: { orgId },
          include: { skill: { select: { name: true, maxLevel: true } } },
          take: 500,
        });
        return skills.map((s) => ({
          skillName: s.skill.name,
          currentLevel: s.currentLevel,
          maxLevel: s.skill.maxLevel,
          completed: !!s.completedAt,
        }));
      }
      default:
        return [];
    }
  }
}
