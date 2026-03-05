import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import { Prisma } from '@prisma/client';

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
}
