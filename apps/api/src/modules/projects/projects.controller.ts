import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import { Prisma } from '@prisma/client';
import { CreateCommentDto, MoveTaskDto, CreateRiskDto, UpdateRiskDto, CreateChecklistDto, ToggleChecklistItemDto } from './projects.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ── Plans ──

  @Post('plans')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new plan' })
  createPlan(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      title: string; planType?: string; sectionIDescription?: string;
      sectionIIObjectives?: Prisma.InputJsonValue; sectionIIIOutcomes?: Prisma.InputJsonValue;
      sectionIVActivities?: Prisma.InputJsonValue; sectionVPersonnel?: Prisma.InputJsonValue;
      sectionVIContent?: Prisma.InputJsonValue; sectionVIITimeline?: Prisma.InputJsonValue;
      sectionVIIIProposal?: string; sectionIXBudget?: Prisma.InputJsonValue;
    },
  ) {
    return this.projectsService.createPlan(user.orgId, body, user.userId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List plans (paginated)' })
  findPlans(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('planType') planType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.projectsService.findPlans(user.orgId, { status, planType }, page ?? 1, limit ?? 20);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan by ID' })
  findPlanById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.projectsService.findPlanById(user.orgId, id);
  }

  @Post('plans/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition plan status (SM-2)' })
  transitionPlan(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { action: string; rejectionReason?: string },
  ) {
    return this.projectsService.transitionPlan(user.orgId, id, body.action, user.userId, body.rejectionReason);
  }

  @Post('plans/:id/generate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Generate project + tasks from approved plan' })
  generateFromPlan(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.projectsService.generateProjectFromPlan(user.orgId, id, user.userId);
  }

  // ── Plan Revisions (T-0134) ──

  @Get('plans/:id/revisions')
  @ApiOperation({ summary: 'List plan revision history' })
  getPlanRevisions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.projectsService.getPlanRevisions(user.orgId, id, page ?? 1, limit ?? 20);
  }

  @Post('plans/:id/revisions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create manual plan revision snapshot' })
  createManualRevision(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { changeReason?: string },
  ) {
    return this.projectsService.createManualRevision(user.orgId, id, user.userId, body.changeReason);
  }

  // ── Projects ──

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new project' })
  createProject(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      title: string; description?: string; projectType?: string;
      sourcePlanId?: string; objectives?: Prisma.InputJsonValue;
      keyResults?: Prisma.InputJsonValue; ownerId?: string;
      startDate?: string; endDate?: string; settings?: Prisma.InputJsonValue;
    },
  ) {
    return this.projectsService.createProject(user.orgId, body, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List projects (paginated, filterable)' })
  findProjects(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('projectType') projectType?: string,
    @Query('ownerId') ownerId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.projectsService.findProjects(user.orgId, { status, projectType, ownerId }, page ?? 1, limit ?? 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID with tasks' })
  findProjectById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.projectsService.findProjectById(user.orgId, id);
  }

  @Post(':id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition project status (SM-3)' })
  transitionProject(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('action') action: string,
  ) {
    return this.projectsService.transitionProject(user.orgId, id, action, user.userId);
  }

  // ── Tasks ──

  @Post(':id/tasks')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create task in project' })
  createTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: {
      title: string; description?: string; taskType?: string;
      assigneeIds?: string[]; reporterId?: string;
      startDate?: string; dueDate?: string; storyPoints?: number;
      priority?: string; tags?: string[]; parentTaskId?: string; position?: number;
    },
  ) {
    return this.projectsService.createTask(user.orgId, projectId, body, user.userId);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'List tasks in project' })
  findTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.projectsService.findTasks(user.orgId, projectId, { status, priority, assigneeId }, page ?? 1, limit ?? 50);
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task by ID' })
  findTaskById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.projectsService.findTaskById(user.orgId, id);
  }

  @Patch('tasks/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update task details' })
  updateTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: {
      title?: string; description?: string; assigneeIds?: string[];
      startDate?: string; dueDate?: string; storyPoints?: number;
      priority?: string; tags?: string[]; position?: number;
    },
  ) {
    return this.projectsService.updateTask(user.orgId, id, body, user.userId);
  }

  @Post('tasks/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition task status (SM-4)' })
  transitionTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('action') action: string,
  ) {
    return this.projectsService.transitionTask(user.orgId, id, action, user.userId);
  }

  // ── Kanban ──

  @Get(':id/kanban')
  @ApiOperation({ summary: 'Get kanban board (tasks grouped by status)' })
  getKanban(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
    return this.projectsService.getKanban(user.orgId, projectId);
  }

  // ── Tree View (T-0138) ──

  @Get(':id/tree')
  @ApiOperation({ summary: 'Get project tree (phases → tasks hierarchy)' })
  getProjectTree(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
    return this.projectsService.getProjectTree(user.orgId, projectId);
  }

  // ── Phases (T-0136) ──

  @Post(':id/phases')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a phase/sprint/work_package in project' })
  createPhase(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: {
      title: string; phaseType?: string; parentId?: string;
      startDate?: string; endDate?: string; position?: number;
    },
  ) {
    return this.projectsService.createPhase(user.orgId, projectId, body);
  }

  @Get(':id/phases')
  @ApiOperation({ summary: 'List phases for a project' })
  findPhases(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
    return this.projectsService.findPhases(user.orgId, projectId);
  }

  // ── Comments (T-0140) ──

  @Post(':id/comments')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Add comment to project or task' })
  addComment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: { content: string; taskId?: string },
  ) {
    return this.projectsService.addComment(user.orgId, projectId, user.userId, body.content, body.taskId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List project/task comments' })
  findComments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Query('taskId') taskId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.projectsService.findComments(user.orgId, projectId, taskId, page ?? 1, limit ?? 20);
  }

  // ── Dependencies (T-0141) ──

  @Post(':id/dependencies')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Add task dependency' })
  addDependency(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: { sourceTaskId: string; targetTaskId: string; dependencyType?: string; lagDays?: number },
  ) {
    return this.projectsService.addDependency(user.orgId, projectId, body);
  }

  @Get(':id/dependencies')
  @ApiOperation({ summary: 'List task dependencies' })
  findDependencies(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
    return this.projectsService.findDependencies(user.orgId, projectId);
  }

  @Delete(':id/dependencies/:depId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Remove a task dependency' })
  removeDependency(@CurrentUser() user: CurrentUserPayload, @Param('depId') depId: string) {
    return this.projectsService.removeDependency(user.orgId, depId);
  }

  // ── Gantt / Timeline (T-0142) ──

  @Get(':id/gantt')
  @ApiOperation({ summary: 'Get Gantt/timeline data (phases + tasks + dependencies)' })
  getGanttData(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
    return this.projectsService.getGanttData(user.orgId, projectId);
  }

  // ── Documents / Wiki (T-0143) ──

  @Post(':id/documents')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create project document (wiki/SOP/notes)' })
  createDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: { title: string; content?: string; docType?: string; parentId?: string },
  ) {
    return this.projectsService.createDocument(user.orgId, projectId, user.userId, body);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List project documents' })
  findDocuments(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
    return this.projectsService.findDocuments(user.orgId, projectId);
  }

  @Patch(':id/documents/:docId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update a document' })
  updateDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param('docId') docId: string,
    @Body() body: { title?: string; content?: string },
  ) {
    return this.projectsService.updateDocument(user.orgId, docId, body);
  }

  // ── Time Tracking (T-0144) ──

  @Post(':id/time-entries')
  @ApiOperation({ summary: 'Log time to project/task' })
  logTime(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: { hours: number; description?: string; logDate: string; taskId?: string },
  ) {
    return this.projectsService.logTime(user.orgId, projectId, user.userId, body);
  }

  @Get(':id/time-entries')
  @ApiOperation({ summary: 'List time entries' })
  findTimeEntries(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.projectsService.findTimeEntries(user.orgId, projectId, taskId);
  }

  // ── Cost Tracking (T-0144) ──

  @Post(':id/cost-entries')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Log cost to project/task' })
  logCost(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: { category: string; amount: number; currency?: string; description?: string; logDate: string; taskId?: string },
  ) {
    return this.projectsService.logCost(user.orgId, projectId, user.userId, body);
  }

  @Get(':id/cost-entries')
  @ApiOperation({ summary: 'List cost entries' })
  findCostEntries(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.projectsService.findCostEntries(user.orgId, projectId, taskId);
  }

  // ── Comment Delete (T-1034) ──

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete own comment' })
  deleteComment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('commentId') commentId: string,
  ) {
    return this.projectsService.deleteComment(user.orgId, commentId, user.userId);
  }

  // ── Kanban DnD (T-1032) ──

  @Patch(':id/tasks/:taskId/move')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Move task (status + position)' })
  moveTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: MoveTaskDto,
  ) {
    return this.projectsService.moveTask(user.orgId, projectId, taskId, body, user.userId);
  }

  // ── Risk Register (T-1035) ──

  @Post(':id/risks')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a project risk' })
  createRisk(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: CreateRiskDto,
  ) {
    return this.projectsService.createRisk(user.orgId, projectId, user.userId, body);
  }

  @Get(':id/risks')
  @ApiOperation({ summary: 'List project risks' })
  findRisks(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Query('status') status?: string,
  ) {
    return this.projectsService.findRisks(user.orgId, projectId, status);
  }

  @Patch('risks/:riskId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update a risk' })
  updateRisk(
    @CurrentUser() user: CurrentUserPayload,
    @Param('riskId') riskId: string,
    @Body() body: UpdateRiskDto,
  ) {
    return this.projectsService.updateRisk(user.orgId, riskId, body as any);
  }

  // ── Checklists (T-1035) ──

  @Post(':id/checklists')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a checklist' })
  createChecklist(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: CreateChecklistDto,
  ) {
    return this.projectsService.createChecklist(user.orgId, projectId, user.userId, body);
  }

  @Get(':id/checklists')
  @ApiOperation({ summary: 'List checklists' })
  findChecklists(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.projectsService.findChecklists(user.orgId, projectId, taskId);
  }

  @Patch('checklists/:checklistId/toggle')
  @ApiOperation({ summary: 'Toggle checklist item' })
  toggleChecklistItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('checklistId') checklistId: string,
    @Body() body: ToggleChecklistItemDto,
  ) {
    return this.projectsService.toggleChecklistItem(user.orgId, checklistId, body.itemIndex);
  }

  // ── Due Alerts (T-1036) ──

  @Get(':id/alerts')
  @ApiOperation({ summary: 'Get overdue + upcoming task alerts' })
  getProjectDueAlerts(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.getProjectDueAlerts(user.orgId, projectId);
  }
}
