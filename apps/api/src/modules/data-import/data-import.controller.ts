import { Controller, Get, Post, Body, Query, UseGuards, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { DataImportService } from './data-import.service';
import { AuthGuard, RolesGuard } from '../../core/auth';
import { CurrentUser, OrgId, Roles } from '../../common/decorators';

@ApiTags('DataImport')
@ApiBearerAuth()
@Controller('data-import')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class DataImportController {
  constructor(private readonly service: DataImportService) {}

  @Get('template/:importType')
  @ApiOperation({ summary: 'Download CSV template for the given import type' })
  getTemplate(@Param('importType') importType: string) {
    return { csv: this.service.getCsvTemplate(importType), importType };
  }

  @Post('members')
  @ApiOperation({ summary: 'Import members from CSV. Use isDryRun=true to validate first.' })
  async importMembers(
    @OrgId() orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { csvContent: string; isDryRun?: boolean },
  ) {
    return this.service.importMembers(orgId, userId, body.csvContent, body.isDryRun ?? true);
  }

  @Post('members/async')
  @ApiOperation({ summary: 'Queue a member CSV import and track progress by batch ID' })
  async queueMembersImport(
    @OrgId() orgId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { csvContent: string; isDryRun?: boolean },
  ) {
    return this.service.queueMembersImport(orgId, userId, body.csvContent, body.isDryRun ?? false);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get import history for the org' })
  async getHistory(@OrgId() orgId: string, @Query('importType') importType?: string) {
    return this.service.getImportHistory(orgId, importType);
  }

  @Get('batches/:batchId/report')
  @ApiOperation({ summary: 'Download the validation/import report CSV for a batch' })
  async getBatchReport(
    @OrgId() orgId: string,
    @Param('batchId') batchId: string,
    @Res() res: Response,
  ) {
    const csv = await this.service.getImportReportCsv(orgId, batchId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="import-report-${batchId}.csv"`);
    res.send(csv);
  }

  @Get('batches/:batchId')
  @ApiOperation({ summary: 'Get import batch status, progress, and validation summary' })
  async getBatch(@OrgId() orgId: string, @Param('batchId') batchId: string) {
    return this.service.getImportBatch(orgId, batchId);
  }
}
