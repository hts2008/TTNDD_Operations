import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferenceDto {
  @ApiProperty({ description: 'Notification channel (in_app, zalo, fcm, email)' })
  @IsString()
  channel!: string;

  @ApiProperty({ description: 'Event type to configure' })
  @IsString()
  eventType!: string;

  @ApiProperty({ description: 'Whether this channel is enabled for this event type' })
  @IsBoolean()
  enabled!: boolean;
}

export class UpsertTemplateDto {
  @ApiProperty({ description: 'Domain event type that triggers this template' })
  @IsString()
  eventType!: string;

  @ApiProperty({ description: 'Delivery channel for this template' })
  @IsString()
  channel!: string;

  @ApiProperty({ description: 'Notification title (supports {{variable}} syntax)' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Notification body (supports {{variable}} syntax)' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ description: 'Whether template is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
