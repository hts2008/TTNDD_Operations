import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import {
  CreatePlanDto,
  UpdatePlanDto,
  TransitionPlanDto,
  CreatePlanFromTemplateDto,
  CreateProjectDto,
  TransitionProjectDto,
  CreateTaskDto,
  UpdateTaskDto,
  TransitionTaskDto,
} from './projects.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ── Plan Templates (T-1022) ──

  @Get('plans/templates')
  @ApiOperation({ summary: 'T-1022: List available plan templates' })
  getTemplates() {
    return this.projectsService.getTemplates();
  }

  @Post('plans/from-template')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1022: Create plan from template' })
  createFromTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: CreatePlanFromTemplateDto,
  ) {
    return this.projectsService.createPlanFromTemplate(
      user.orgId,
      body.templateKey,
      body.title,
      user.userId,
    );
  }

  // ── Plans ──

  @Post('plans')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new plan (T-1021)' })
  createPlan(@CurrentUser() user: CurrentUserPayload, @Body() body: CreatePlanDto) {
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

  @Patch('plans/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1023: Update plan (autosave — creates version)' })
  updatePlan(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: UpdatePlanDto,
  ) {
    return this.projectsService.updatePlan(user.orgId, id, body, user.userId);
  }

  @Get('plans/:id/versions')
  @ApiOperation({ summary: 'T-1023: Get plan version history' })
  getPlanVersions(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.projectsService.getPlanVersions(user.orgId, id);
  }

  @Post('plans/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition plan status (SM-2) with guards (T-1024/T-1026)' })
  transitionPlan(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: TransitionPlanDto,
  ) {
    return this.projectsService.transitionPlan(
      user.orgId,
      id,
      body.action,
      user.userId,
      body.rejectionReason,
    );
  }

  @Post('plans/:id/generate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1028: Generate project + tasks from approved plan (RACI + budget)' })
  generateFromPlan(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.projectsService.generateProjectFromPlan(user.orgId, id, user.userId);
  }

  // ── Projects ──

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new project (T-1021)' })
  createProject(@CurrentUser() user: CurrentUserPayload, @Body() body: CreateProjectDto) {
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
    return this.projectsService.findProjects(
      user.orgId,
      { status, projectType, ownerId },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get('tasks/due-alerts')
  @ApiOperation({ summary: 'T-1036: Get tasks due within 48h' })
  getDueAlerts(@CurrentUser() user: CurrentUserPayload, @Query('hours') hours?: number) {
    return this.projectsService.getDueAlerts(user.orgId, hours ?? 48);
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
    @Body() body: TransitionProjectDto,
  ) {
    return this.projectsService.transitionProject(user.orgId, id, body.action, user.userId);
  }

  // ── T-1033: Calendar ──

  @Get(':id/calendar')
  @ApiOperation({ summary: 'T-1033: Get calendar data for project tasks' })
  getCalendar(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
    return this.projectsService.getCalendarData(user.orgId, projectId);
  }

  // ── Tasks ──

  @Post(':id/tasks')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create task in project' })
  createTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') projectId: string,
    @Body() body: CreateTaskDto,
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
    return this.projectsService.findTasks(
      user.orgId,
      projectId,
      { status, priority, assigneeId },
      page ?? 1,
      limit ?? 50,
    );
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
    @Body() body: UpdateTaskDto,
  ) {
    return this.projectsService.updateTask(user.orgId, id, body, user.userId);
  }

  @Post('tasks/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition task status (SM-4) with EXP hooks (T-1037)' })
  transitionTask(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: TransitionTaskDto,
  ) {
    return this.projectsService.transitionTask(user.orgId, id, body.action, user.userId);
  }

  // ── Kanban ──

  @Get(':id/kanban')
  @ApiOperation({ summary: 'Get kanban board (tasks grouped by status)' })
  getKanban(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
    return this.projectsService.getKanban(user.orgId, projectId);
  }
}
