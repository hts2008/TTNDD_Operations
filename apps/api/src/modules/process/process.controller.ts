import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
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
}
