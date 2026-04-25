import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import {
  CreateTicketDto,
  TransitionTicketDto,
  AddCommentDto,
  EscalateTicketDto,
  RequestApprovalDto,
  ApproveRejectDto,
} from './tickets.dto';

@ApiTags('Tickets')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ── CRUD ──

  @Post()
  @ApiOperation({ summary: 'Create ticket (auto-generates number + SLA deadlines)' })
  createTicket(@CurrentUser() user: CurrentUserPayload, @Body() body: CreateTicketDto) {
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
        status,
        priority,
        category,
        assigneeId,
        requesterId,
        isSensitive: isSensitive !== undefined ? isSensitive === 'true' : undefined,
      },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get('sla-dashboard')
  @ApiOperation({ summary: 'T-1058: SLA metrics dashboard' })
  getSlaDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.ticketsService.getSlaDashboard(user.orgId);
  }

  @Get('category-routing')
  @ApiOperation({ summary: 'T-1042: Get category → assignee routing rules' })
  getCategoryRouting() {
    return this.ticketsService.getCategoryRouting();
  }

  @Get('consent-templates')
  @ApiOperation({ summary: 'T-1054: List guardian consent templates' })
  getConsentTemplates() {
    return this.ticketsService.getConsentTemplates();
  }

  @Post('consent/:templateKey')
  @ApiOperation({ summary: 'T-1054: Create consent ticket from template' })
  createConsentTicket(
    @CurrentUser() user: CurrentUserPayload,
    @Param('templateKey') templateKey: string,
    @Body() body: { guardianName: string },
  ) {
    return this.ticketsService.createConsentTicket(
      user.orgId,
      templateKey,
      body.guardianName,
      user.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID with comments and status history' })
  findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ticketsService.findById(user.orgId, id);
  }

  // ── SM-5 Transitions ──

  @Post(':id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition ticket status (SM-5)' })
  transitionTicket(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: TransitionTicketDto,
  ) {
    return this.ticketsService.transitionTicket(user.orgId, id, body.action, user.userId, {
      assigneeId: body.assigneeId,
      approvalNotes: body.approvalNotes,
    });
  }

  // ── Escalation ──

  @Post(':id/escalate')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1053: Escalate ticket priority' })
  escalateTicket(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: EscalateTicketDto,
  ) {
    return this.ticketsService.escalateTicket(user.orgId, id, user.userId, body.reason);
  }

  // ── Approval ──

  @Post(':id/approval')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1046: Request approval on ticket' })
  requestApproval(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: RequestApprovalDto,
  ) {
    return this.ticketsService.requestApproval(user.orgId, id, user.userId, body);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1047: Approve/reject ticket approval request' })
  handleApproval(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: ApproveRejectDto,
  ) {
    return this.ticketsService.handleApproval(
      user.orgId,
      id,
      user.userId,
      body.decision,
      body.notes,
    );
  }

  // ── Comments ──

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to ticket' })
  addComment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: AddCommentDto,
  ) {
    return this.ticketsService.addComment(user.orgId, id, body, user.userId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get all comments for a ticket' })
  getComments(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.ticketsService.getComments(user.orgId, id);
  }
}
