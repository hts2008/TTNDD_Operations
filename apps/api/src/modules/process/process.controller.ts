import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProcessService } from './process.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Process')
@ApiBearerAuth()
@Controller('process')
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  // ── Definitions ──

  @Post('definitions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create workflow definition' })
  createDefinition(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string; description?: string;
      steps: Array<{ name: string; type: 'approval' | 'task' | 'notification'; assigneeRole?: string; description?: string }>;
    },
  ) {
    return this.processService.createDefinition(user.orgId, body, user.userId);
  }

  @Get('definitions')
  @ApiOperation({ summary: 'List workflow definitions' })
  findDefinitions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('isActive') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.processService.findDefinitions(
      user.orgId,
      { isActive: isActive !== undefined ? isActive === 'true' : undefined },
      page ?? 1, limit ?? 20,
    );
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get workflow definition with recent runs' })
  findDefinitionById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.findDefinitionById(user.orgId, id);
  }

  @Patch('definitions/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update workflow definition (increments version)' })
  updateDefinition(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; steps?: unknown[]; triggers?: unknown[]; isActive?: boolean },
  ) {
    return this.processService.updateDefinition(user.orgId, id, body, user.userId);
  }

  @Post('definitions/:id/publish')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Publish a workflow definition' })
  publishDefinition(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.publishDefinition(user.orgId, id, user.userId);
  }

  @Post('definitions/:id/retire')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Retire a workflow definition' })
  retireDefinition(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.retireDefinition(user.orgId, id, user.userId);
  }

  // ── Runs ──

  @Post('runs')
  @ApiOperation({ summary: 'Start a new workflow run' })
  startRun(
    @CurrentUser() user: CurrentUserPayload,
    @Body('definitionId') definitionId: string,
  ) {
    return this.processService.startRun(user.orgId, definitionId, user.userId);
  }

  @Get('runs')
  @ApiOperation({ summary: 'List workflow runs' })
  findRuns(
    @CurrentUser() user: CurrentUserPayload,
    @Query('definitionId') definitionId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.processService.findRuns(user.orgId, { definitionId, status }, page ?? 1, limit ?? 20);
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get workflow run detail' })
  findRunById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.findRunById(user.orgId, id);
  }

  @Post('runs/:id/advance')
  @ApiOperation({ summary: 'Advance current step (approve/reject/complete)' })
  advanceStep(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected' | 'completed'; notes?: string },
  ) {
    return this.processService.advanceStep(user.orgId, id, body, user.userId);
  }

  @Post('runs/:id/complete')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Force-complete a workflow run' })
  completeRun(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.completeRun(user.orgId, id, user.userId);
  }

  // ── T-0158: Triggers ──

  @Post('triggers')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a workflow trigger' })
  createTrigger(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string; eventType: string;
      conditions: { field: string; operator: string; value: unknown }[];
      actions: { type: string; config: Record<string, unknown> }[];
      definitionId?: string;
    },
  ) {
    return this.processService.createTrigger(user.orgId, body, user.userId);
  }

  @Get('triggers')
  @ApiOperation({ summary: 'List workflow triggers' })
  findTriggers(
    @CurrentUser() user: CurrentUserPayload,
    @Query('eventType') eventType?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.processService.findTriggers(user.orgId, {
      eventType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Post('triggers/fire')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Evaluate and fire triggers for an event' })
  fireTriggersForEvent(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { eventType: string; context: Record<string, unknown> },
  ) {
    return this.processService.evaluateAndFireTriggers(user.orgId, body.eventType, body.context, user.userId);
  }

  // ── T-0159: SOP Documents ──

  @Post('sop-documents')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create SOP document' })
  createSopDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { title: string; content: string; category?: string; tags?: string[]; relatedWorkflowId?: string },
  ) {
    return this.processService.createSopDocument(user.orgId, body, user.userId);
  }

  @Get('sop-documents')
  @ApiOperation({ summary: 'List/search SOP documents' })
  findSopDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.processService.findSopDocuments(user.orgId, { category, status, search }, page ?? 1, limit ?? 20);
  }

  @Get('sop-documents/:id')
  @ApiOperation({ summary: 'Get SOP document detail' })
  findSopDocumentById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.findSopDocumentById(user.orgId, id);
  }

  @Patch('sop-documents/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update SOP document (increments version)' })
  updateSopDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string; category?: string; tags?: string[] },
  ) {
    return this.processService.updateSopDocument(user.orgId, id, body, user.userId);
  }

  @Post('sop-documents/:id/publish')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Publish SOP document' })
  publishSopDocument(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.publishSopDocument(user.orgId, id, user.userId);
  }

  @Post('sop-documents/:id/archive')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Archive SOP document' })
  archiveSopDocument(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.archiveSopDocument(user.orgId, id);
  }
}
