import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications (paginated)' })
  getMyNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe) unreadOnly?: boolean,
  ) {
    return this.notificationsService.findByRecipient(
      user.orgId,
      user.memberId ?? user.userId,
      page ?? 1,
      limit ?? 20,
      unreadOnly,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.getUnreadCount(
      user.orgId,
      user.memberId ?? user.userId,
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(
      user.orgId,
      id,
      user.memberId ?? user.userId,
    );
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(
      user.orgId,
      user.memberId ?? user.userId,
    );
  }

  // ── Preferences ──

  @Get('preferences')
  @ApiOperation({ summary: 'Get my notification preferences' })
  getPreferences(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.getPreferences(user.orgId, user.userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update a notification preference' })
  updatePreference(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { channel: string; eventType: string; enabled: boolean },
  ) {
    return this.notificationsService.updatePreference(
      user.orgId,
      user.userId,
      body.channel,
      body.eventType,
      body.enabled,
    );
  }

  // ── Templates (admin) ──

  @Get('templates')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List notification templates' })
  getTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.getTemplates(user.orgId);
  }

  @Post('templates')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create or update a notification template' })
  upsertTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { eventType: string; channel: string; title: string; body: string; isActive?: boolean },
  ) {
    return this.notificationsService.upsertTemplate(user.orgId, body);
  }
}
