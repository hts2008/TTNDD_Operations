import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsInt,
  Min,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Plan DTOs ─────────────────────────────────────────────────────────

export class CreatePlanDto {
  @ApiProperty({ example: 'Trại hè Vũng Tàu 2026' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'camp', description: 'camp | event | year_plan' })
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional({ description: 'Section I: Mô tả chung' })
  @IsOptional()
  @IsString()
  sectionIDescription?: string;

  @ApiPropertyOptional({ description: 'Section II: Mục tiêu' })
  @IsOptional()
  sectionIIObjectives?: any;

  @ApiPropertyOptional({ description: 'Section III: Kết quả dự kiến' })
  @IsOptional()
  sectionIIIOutcomes?: any;

  @ApiPropertyOptional({ description: 'Section IV: Hoạt động' })
  @IsOptional()
  @IsArray()
  sectionIVActivities?: any;

  @ApiPropertyOptional({ description: 'Section V: Nhân sự & RACI' })
  @IsOptional()
  sectionVPersonnel?: any;

  @ApiPropertyOptional({ description: 'Section VI: Nội dung chương trình' })
  @IsOptional()
  sectionVIContent?: any;

  @ApiPropertyOptional({ description: 'Section VII: Thời gian biểu' })
  @IsOptional()
  sectionVIITimeline?: any;

  @ApiPropertyOptional({ description: 'Section VIII: Đề xuất' })
  @IsOptional()
  @IsString()
  sectionVIIIProposal?: string;

  @ApiPropertyOptional({ description: 'Section IX: Ngân sách' })
  @IsOptional()
  sectionIXBudget?: any;
}

export class UpdatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionIDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  sectionIIObjectives?: any;

  @ApiPropertyOptional()
  @IsOptional()
  sectionIIIOutcomes?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  sectionIVActivities?: any;

  @ApiPropertyOptional()
  @IsOptional()
  sectionVPersonnel?: any;

  @ApiPropertyOptional()
  @IsOptional()
  sectionVIContent?: any;

  @ApiPropertyOptional()
  @IsOptional()
  sectionVIITimeline?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionVIIIProposal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  sectionIXBudget?: any;
}

export class TransitionPlanDto {
  @ApiProperty({ example: 'submit', description: 'submit | approve | reject | lock | resubmit' })
  @IsString()
  @IsNotEmpty()
  action!: string;

  @ApiPropertyOptional({ example: 'Thiếu mục ngân sách' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

// ─── Plan Filter / Template DTOs ───────────────────────────────────────

export class PlanFilterDto {
  @ApiPropertyOptional({ example: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'camp' })
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class CreatePlanFromTemplateDto {
  @ApiProperty({ example: 'camp', description: 'Template key: camp | event | year_plan' })
  @IsString()
  @IsNotEmpty()
  templateKey!: string;

  @ApiProperty({ example: 'Trại hè Vũng Tàu 2026' })
  @IsString()
  @IsNotEmpty()
  title!: string;
}

// ─── Project DTOs ──────────────────────────────────────────────────────

export class CreateProjectDto {
  @ApiProperty({ example: 'Dự án trại hè 2026' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'camp' })
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourcePlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  objectives?: any;

  @ApiPropertyOptional()
  @IsOptional()
  keyResults?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-05' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: any;
}

export class ProjectFilterDto {
  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'camp' })
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class TransitionProjectDto {
  @ApiProperty({ example: 'activate', description: 'activate | hold | resume | complete | cancel' })
  @IsString()
  @IsNotEmpty()
  action!: string;
}

// ─── Task DTOs ─────────────────────────────────────────────────────────

export class CreateTaskDto {
  @ApiProperty({ example: 'Chuẩn bị lều bạt' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'task' })
  @IsOptional()
  @IsString()
  taskType?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  assigneeIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reporterId?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-05' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentTaskId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  position?: number;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  assigneeIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  storyPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  position?: number;

  @ApiPropertyOptional({ description: 'Kanban status override for drag-drop' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class TransitionTaskDto {
  @ApiProperty({ example: 'start', description: 'start | review | approve | reject | cancel' })
  @IsString()
  @IsNotEmpty()
  action!: string;
}

export class TaskFilterDto {
  @ApiPropertyOptional({ example: 'in_progress' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// ─── Comment DTO ───────────────────────────────────────────────────────

export class CreateCommentDto {
  @ApiProperty({ example: 'Đã kiểm tra số lượng lều — đủ cho 50 người' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ type: [String], description: 'Mentioned user IDs' })
  @IsOptional()
  @IsArray()
  mentionedUserIds?: string[];
}

// ─── Risk DTO ──────────────────────────────────────────────────────────

export class CreateRiskDto {
  @ApiProperty({ example: 'Mưa lớn trong ngày trại' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'high', description: 'low | medium | high | critical' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ example: 'medium', description: 'low | medium | high' })
  @IsOptional()
  @IsString()
  likelihood?: string;

  @ApiPropertyOptional({ example: 'Chuẩn bị phương án trú mưa' })
  @IsOptional()
  @IsString()
  mitigation?: string;
}
