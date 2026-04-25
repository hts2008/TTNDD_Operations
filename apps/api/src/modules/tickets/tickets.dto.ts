import { IsString, IsOptional, IsNotEmpty, IsArray, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Ticket DTOs ───────────────────────────────────────────────────────

export class CreateTicketDto {
  @ApiProperty({ example: 'Không thể đăng nhập hệ thống' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Tài khoản' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  customFields?: any;

  @ApiPropertyOptional({ description: 'Mark as sensitive/incident ticket' })
  @IsOptional()
  @IsBoolean()
  isSensitive?: boolean;

  @ApiPropertyOptional({ description: 'Anonymous submission' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class TransitionTicketDto {
  @ApiProperty({
    example: 'assign',
    description: 'assign | start | resolve | close | reopen | reassign',
  })
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

export class AddCommentDto {
  @ApiProperty({ example: 'Đã kiểm tra — lỗi do mật khẩu hết hạn' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ description: 'Internal-only comment (not visible to requester)' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  attachments?: any;
}

export class TicketFilterDto {
  @ApiPropertyOptional({ example: 'open' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: 'Tài khoản' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requesterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  isSensitive?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// ─── Escalation DTO ────────────────────────────────────────────────────

export class EscalateTicketDto {
  @ApiPropertyOptional({ example: 'Không phản hồi sau 24h' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Approval DTOs ─────────────────────────────────────────────────────

export class RequestApprovalDto {
  @ApiProperty({
    example: 'budget',
    description: 'Approval type: budget | consent | advancement | general',
  })
  @IsString()
  @IsNotEmpty()
  approvalType!: string;

  @ApiPropertyOptional({ example: 5000000, description: 'Amount for budget approvals (VND)' })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveRejectDto {
  @ApiProperty({ example: 'approve', description: 'approve | reject' })
  @IsString()
  @IsNotEmpty()
  decision!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
