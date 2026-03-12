import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import { Prisma } from '@prisma/client';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // T-0070: HR Helpdesk Ticket Categories
  @Get('categories')
  @ApiOperation({ summary: 'T-0070: Get ticket categories (HR helpdesk + general)' })
  getCategories(@Query('group') group?: 'hr' | 'general' | 'all') {
    return this.ticketsService.getCategories(group);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new ticket (auto-generates ticketNumber)' })
  createTicket(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      title: string; description?: string; category?: string;
      priority?: string; assigneeId?: string; dueDate?: string;
      tags?: string[]; customFields?: Prisma.InputJsonValue;
      isSensitive?: boolean; isAnonymous?: boolean;
    },
  ) {
    return this.ticketsService.createTicket(
      user.orgId,
      { ...body, requesterId: user.userId },
      user.userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List tickets (paginated, filterable)' })
  findTickets(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('requesterId') requesterId?: string,
    @Query('isSensitive') isSensitive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ticketsService.findTickets(
      user.orgId,
      {
        status, priority, category, assigneeId, requesterId,
        isSensitive: isSensitive !== undefined ? isSensitive === 'true' : undefined,
      },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID with comments and status history' })
  findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ticketsService.findById(user.orgId, id);
  }

  @Post(':id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition ticket status (SM-5)' })
  transitionTicket(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { action: string; assigneeId?: string; approvalNotes?: string },
  ) {
    return this.ticketsService.transitionTicket(user.orgId, id, body.action, user.userId, {
      assigneeId: body.assigneeId,
      approvalNotes: body.approvalNotes,
    });
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to ticket' })
  addComment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { content: string; isInternal?: boolean; attachments?: Prisma.InputJsonValue },
  ) {
    return this.ticketsService.addComment(user.orgId, id, body, user.userId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get all comments for a ticket' })
  getComments(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ticketsService.getComments(user.orgId, id);
  }

  // ── T-0147: Routing Rules ──

  @Post('routing-rules')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0147: Create a ticket routing rule' })
  createRoutingRule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string; description?: string; matchMode?: string;
      conditions: { field: string; operator: string; value: string | string[] }[];
      assignToUserId?: string; assignToTeam?: string;
      setPriority?: string; addTags?: string[]; setCategory?: string;
      priority?: number;
    },
  ) {
    return this.ticketsService.createRoutingRule(user.orgId, body, user.userId);
  }

  @Get('routing-rules')
  @ApiOperation({ summary: 'T-0147: List routing rules' })
  findRoutingRules(
    @CurrentUser() user: CurrentUserPayload,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.ticketsService.findRoutingRules(user.orgId, activeOnly !== 'false');
  }

  @Patch('routing-rules/:ruleId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0147: Update a routing rule' })
  updateRoutingRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('ruleId') ruleId: string,
    @Body() body: Partial<{
      name: string; description: string; isActive: boolean; matchMode: string;
      conditions: { field: string; operator: string; value: string | string[] }[];
      assignToUserId: string | null; assignToTeam: string | null;
      setPriority: string | null; addTags: string[]; setCategory: string | null;
      priority: number;
    }>,
  ) {
    return this.ticketsService.updateRoutingRule(user.orgId, ruleId, body);
  }

  @Delete('routing-rules/:ruleId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0147: Delete a routing rule' })
  deleteRoutingRule(
    @CurrentUser() user: CurrentUserPayload,
    @Param('ruleId') ruleId: string,
  ) {
    return this.ticketsService.deleteRoutingRule(user.orgId, ruleId);
  }

  @Post('test-routing')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0147: Test routing rules against a sample ticket' })
  testRouting(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { category?: string; priority: string; tags: string[]; title: string },
  ) {
    return this.ticketsService.evaluateRouting(user.orgId, body);
  }

  // ── T-0149: SLA Management ──

  @Post('sla-configs')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0149: Create SLA config for a priority level' })
  createSlaConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string; priority: string;
      responseTimeHours: number; resolutionTimeHours: number;
      escalateToUserId?: string; escalateToTeam?: string;
    },
  ) {
    return this.ticketsService.createSlaConfig(user.orgId, body);
  }

  @Get('sla-configs')
  @ApiOperation({ summary: 'T-0149: List SLA configs' })
  findSlaConfigs(@CurrentUser() user: CurrentUserPayload) {
    return this.ticketsService.findSlaConfigs(user.orgId);
  }

  @Patch('sla-configs/:configId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0149: Update SLA config' })
  updateSlaConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Param('configId') configId: string,
    @Body() body: Partial<{
      name: string; responseTimeHours: number; resolutionTimeHours: number;
      escalateToUserId: string | null; escalateToTeam: string | null;
      isActive: boolean;
    }>,
  ) {
    return this.ticketsService.updateSlaConfig(user.orgId, configId, body);
  }

  @Get('sla-breaches')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0149: Check SLA breaches for all open tickets' })
  checkSlaBreaches(@CurrentUser() user: CurrentUserPayload) {
    return this.ticketsService.checkSlaBreaches(user.orgId);
  }

  @Post('sla-escalate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-0149: Auto-escalate SLA-breached tickets' })
  escalateBreached(@CurrentUser() user: CurrentUserPayload) {
    return this.ticketsService.escalateBreachedTickets(user.orgId, user.userId);
  }

  // ── T-0150: Attachments ──

  @Post(':id/attachments')
  @ApiOperation({ summary: 'T-0150: Add attachment to ticket' })
  addAttachment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { fileName: string; fileUrl: string; fileSize?: number; mimeType?: string },
  ) {
    return this.ticketsService.addAttachment(user.orgId, id, body, user.userId);
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'T-0150: List ticket attachments' })
  findAttachments(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ticketsService.findAttachments(user.orgId, id);
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: 'T-0150: Delete an attachment' })
  deleteAttachment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.ticketsService.deleteAttachment(user.orgId, attachmentId, user.userId);
  }

  // ── T-0150: Audit Trail ──

  @Get(':id/audit-trail')
  @ApiOperation({ summary: 'T-0150: Get unified audit trail for a ticket' })
  getAuditTrail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ticketsService.getAuditTrail(user.orgId, id);
  }
}
