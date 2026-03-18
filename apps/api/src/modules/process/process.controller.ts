import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProcessService } from './process.service';
import { SopService } from './sop.service';
import {
  WorkflowExecutorService,
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowTrigger,
  type NodeExecutionResult,
} from './workflow-executor.service';
import { TemplateService } from './template.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Process')
@ApiBearerAuth()
@Controller('process')
export class ProcessController {
  constructor(
    private readonly processService: ProcessService,
    private readonly sopService: SopService,
    private readonly executor: WorkflowExecutorService,
    private readonly templateService: TemplateService,
  ) {}

  // ══════════════════════════════════════════════
  // SOP Documents (T-1101 → T-1105)
  // ══════════════════════════════════════════════

  @Post('sops')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create SOP document with initial version' })
  createSop(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      title: string;
      description?: string;
      category?: string;
      tags?: string[];
      content?: Record<string, unknown>;
    },
  ) {
    return this.sopService.create(user.orgId, body, user.userId);
  }

  @Get('sops')
  @ApiOperation({ summary: 'List/search SOP documents' })
  findSops(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sopService.findMany(
      user.orgId,
      { status, category, tag, search },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get('sops/categories')
  @ApiOperation({ summary: 'List distinct SOP categories' })
  findSopCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.sopService.findCategories(user.orgId);
  }

  @Get('sops/tags')
  @ApiOperation({ summary: 'List all SOP tags' })
  findSopTags(@CurrentUser() user: CurrentUserPayload) {
    return this.sopService.findTags(user.orgId);
  }

  @Get('sops/:id')
  @ApiOperation({ summary: 'Get SOP document with versions & approvals' })
  findSopById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.sopService.findById(user.orgId, id);
  }

  @Patch('sops/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update SOP metadata (draft only)' })
  updateSop(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; category?: string; tags?: string[] },
  ) {
    return this.sopService.update(user.orgId, id, body, user.userId);
  }

  @Post('sops/:id/versions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new SOP version' })
  createSopVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { content: Record<string, unknown>; changeNotes?: string },
  ) {
    return this.sopService.createVersion(user.orgId, id, body, user.userId);
  }

  @Get('sops/:id/versions/:versionNo')
  @ApiOperation({ summary: 'Get specific SOP version content' })
  getSopVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('versionNo') versionNo: string,
  ) {
    return this.sopService.getVersion(user.orgId, id, parseInt(versionNo, 10));
  }

  @Post('sops/:id/versions/:versionNo/submit')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Submit SOP version for review' })
  submitSopForReview(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('versionNo') versionNo: string,
  ) {
    return this.sopService.submitForReview(user.orgId, id, parseInt(versionNo, 10), user.userId);
  }

  @Post('sops/:id/versions/:versionNo/approve')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Approve or reject SOP version' })
  approveSopVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('versionNo') versionNo: string,
    @Body() body: { approved: boolean; comments?: string },
  ) {
    return this.sopService.approveVersion(
      user.orgId,
      id,
      parseInt(versionNo, 10),
      body,
      user.userId,
    );
  }

  @Post('sops/:id/versions/:versionNo/publish')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Publish an approved SOP version' })
  publishSopVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('versionNo') versionNo: string,
  ) {
    return this.sopService.publishVersion(user.orgId, id, parseInt(versionNo, 10), user.userId);
  }

  @Get('sops/:id/diff')
  @ApiOperation({ summary: 'Compare two SOP versions' })
  diffSopVersions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query('from') fromVersion: string,
    @Query('to') toVersion: string,
  ) {
    return this.sopService.diffVersions(
      user.orgId,
      id,
      parseInt(fromVersion, 10),
      parseInt(toVersion, 10),
    );
  }

  @Post('sops/:id/archive')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Archive an SOP document' })
  archiveSop(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.sopService.archiveDocument(user.orgId, id, user.userId);
  }

  // ══════════════════════════════════════════════
  // Workflow Definitions (existing linear)
  // ══════════════════════════════════════════════

  @Post('definitions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create workflow definition' })
  createDefinition(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      description?: string;
      steps: Array<{
        name: string;
        type: 'approval' | 'task' | 'notification';
        assigneeRole?: string;
        description?: string;
      }>;
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
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get workflow definition with recent runs' })
  findDefinitionById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.processService.findDefinitionById(user.orgId, id);
  }

  // ── Runs (legacy linear) ──

  @Post('runs')
  @ApiOperation({ summary: 'Start a new workflow run' })
  startRun(@CurrentUser() user: CurrentUserPayload, @Body('definitionId') definitionId: string) {
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
    return this.processService.findRuns(
      user.orgId,
      { definitionId, status },
      page ?? 1,
      limit ?? 20,
    );
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

  // ══════════════════════════════════════════════
  // Graph Workflow Builder (T-1106 → T-1110)
  // ══════════════════════════════════════════════

  @Post('definitions/:id/graph')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1106: Save workflow graph (nodes + edges)' })
  saveGraph(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { nodes: WorkflowNode[]; edges: WorkflowEdge[]; triggers?: WorkflowTrigger[] },
  ) {
    return this.executor.saveDefinitionGraph(user.orgId, id, body, user.userId);
  }

  @Post('graph-runs')
  @ApiOperation({ summary: 'T-1108: Start a graph-based workflow run' })
  startGraphRun(
    @CurrentUser() user: CurrentUserPayload,
    @Body('definitionId') definitionId: string,
  ) {
    return this.executor.startGraphRun(user.orgId, definitionId, user.userId);
  }

  @Post('graph-runs/:id/execute')
  @ApiOperation({ summary: 'T-1108: Execute current node in graph run' })
  executeNode(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: NodeExecutionResult,
  ) {
    return this.executor.executeNode(user.orgId, id, body, user.userId);
  }

  @Post('graph-runs/trigger')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1109: Trigger workflows by event type' })
  handleTrigger(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { eventType: string; payload: Record<string, unknown> },
  ) {
    return this.executor.handleTriggerEvent(user.orgId, body.eventType, body.payload);
  }

  @Get('graph-runs/:id/history')
  @ApiOperation({ summary: 'T-1110: Get run history timeline' })
  getRunHistory(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.executor.getRunHistory(user.orgId, id);
  }

  @Get('graph-runs/stuck')
  @ApiOperation({ summary: 'T-1110: Find stuck workflow runs' })
  findStuckRuns(
    @CurrentUser() user: CurrentUserPayload,
    @Query('thresholdMinutes') thresholdMinutes?: string,
  ) {
    return this.executor.findStuckRuns(
      user.orgId,
      thresholdMinutes ? parseInt(thresholdMinutes, 10) : undefined,
    );
  }

  @Post('graph-runs/:id/retry')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1110: Retry a stuck workflow run' })
  retryStuckRun(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.executor.retryStuckRun(user.orgId, id, user.userId);
  }

  // ══════════════════════════════════════════════
  // Template Library (T-1111 → T-1115)
  // ══════════════════════════════════════════════

  @Get('templates')
  @ApiOperation({ summary: 'T-1111: List workflow templates' })
  listTemplates(@Query('category') category?: string) {
    return this.templateService.findAll(category);
  }

  @Get('templates/:slug')
  @ApiOperation({ summary: 'T-1111: Get template by slug' })
  getTemplate(@Param('slug') slug: string) {
    return this.templateService.findBySlug(slug);
  }

  @Post('templates/:slug/install')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1111: Install template into org as new definition' })
  installTemplate(@CurrentUser() user: CurrentUserPayload, @Param('slug') slug: string) {
    return this.templateService.installTemplate(user.orgId, slug, user.userId);
  }

  @Post('definitions/:id/export')
  @ApiOperation({ summary: 'T-1112: Export workflow definition as JSON' })
  exportDefinition(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.templateService.exportDefinition(user.orgId, id);
  }

  @Post('definitions/import')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1112: Import workflow definition from JSON' })
  importDefinition(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      description?: string;
      nodes: unknown[];
      edges: unknown[];
      triggers?: unknown[];
    },
  ) {
    return this.templateService.importDefinition(
      user.orgId,
      body as Parameters<typeof this.templateService.importDefinition>[1],
      user.userId,
    );
  }

  @Post('templates/seed')
  @Roles('super_admin')
  @ApiOperation({ summary: 'T-1113: Seed built-in templates' })
  seedTemplates() {
    return this.templateService.seedBuiltInTemplates();
  }

  // ══════════════════════════════════════════════
  // Health & Operations (T-1117, T-1118)
  // ══════════════════════════════════════════════

  @Get('health')
  @ApiOperation({ summary: 'T-1117: Process module health metrics' })
  async getHealth(@CurrentUser() user: CurrentUserPayload) {
    const orgId = user.orgId;
    const [defResult, stuckResult] = await Promise.all([
      this.processService.findDefinitions(orgId, undefined, 1, 1),
      this.executor.findStuckRuns(orgId),
    ]);
    return {
      module: 'process',
      status: stuckResult.count > 0 ? 'degraded' : 'healthy',
      metrics: {
        totalDefinitions: defResult.meta.total,
        stuckRuns: stuckResult.count,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('auto-resolve-stuck')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1118: Auto-resolve stuck runs (>24h)' })
  autoResolveStuck(@CurrentUser() user: CurrentUserPayload) {
    return this.executor.autoResolveStuckRuns(user.orgId, user.userId);
  }
}
