import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { EventsCampService } from './events-camp.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Events & Camps')
@ApiBearerAuth()
@Controller('events')
export class EventsCampController {
  constructor(private readonly eventsService: EventsCampService) {}

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create an event/camp' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      title: string;
      eventType?: string;
      startDate: string;
      endDate: string;
      location?: string;
      maxParticipants?: number;
      targetBranches?: string[];
      schedule?: Prisma.InputJsonValue;
      raciMatrix?: Prisma.InputJsonValue;
      riskAssessment?: Prisma.InputJsonValue;
      expReward?: number;
    },
  ) {
    return this.eventsService.create(user.orgId, body, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List events (paginated)' })
  findMany(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.eventsService.findMany(user.orgId, { status, from, to }, page ?? 1, limit ?? 20);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event detail with registrations' })
  findById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.eventsService.findById(user.orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update event details (schedule, RACI, safety, etc.)' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      location?: string;
      schedule?: Prisma.InputJsonValue;
      raciMatrix?: Prisma.InputJsonValue;
      riskAssessment?: Prisma.InputJsonValue;
      safetyChecklist?: Prisma.InputJsonValue;
      postEventReport?: Prisma.InputJsonValue;
    },
  ) {
    return this.eventsService.update(user.orgId, id, body, user.userId);
  }

  @Post(':id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition event status (SM-13, enforces safety gates)' })
  transition(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('action') action: string,
  ) {
    return this.eventsService.transition(user.orgId, id, action, user.userId);
  }

  @Post(':id/register')
  @ApiOperation({ summary: 'Register for an event' })
  register(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.eventsService.register(user.orgId, id, user.memberId!);
  }

  @Post(':id/consent')
  @ApiOperation({ summary: 'Sign parent consent for event' })
  signConsent(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { consentBy: string; memberId?: string },
  ) {
    return this.eventsService.signConsent(
      user.orgId,
      id,
      body.memberId ?? user.memberId!,
      body.consentBy,
      user.memberId!,
      user.userId,
      user.role,
    );
  }

  @Post(':id/check-in/:memberId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Check in a participant' })
  checkIn(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.eventsService.checkIn(user.orgId, id, memberId, user.userId);
  }
}
