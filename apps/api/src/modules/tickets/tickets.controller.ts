import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import { Prisma } from '@prisma/client';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

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
}
