import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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

  @Get('history')
  @ApiOperation({ summary: 'Get import history for the org' })
  async getHistory(
    @OrgId() orgId: string,
    @Query('importType') importType?: string,
  ) {
    return this.service.getImportHistory(orgId, importType);
  }
}
