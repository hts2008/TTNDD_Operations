import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsIn,
  IsUUID,
  Min,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ── Plan DTOs (T-1024) ──

export class CreatePlanDto {
  @ApiProperty({ example: 'Kế hoạch Trại Hè 2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ example: 'camp', enum: ['camp', 'annual', 'training', 'event', 'custom'] })
  @IsOptional()
  @IsString()
  @IsIn(['camp', 'annual', 'training', 'event', 'custom'])
  planType?: string;

  @ApiPropertyOptional({ example: 'Kế hoạch trại hè cho Đoàn TNCD...' })
  @IsOptional()
  @IsString()
  sectionIDescription?: string;

  @ApiPropertyOptional({ description: 'Objectives list as JSON' })
  @IsOptional()
  sectionIIObjectives?: unknown;

  @ApiPropertyOptional({ description: 'Expected outcomes as JSON' })
  @IsOptional()
  sectionIIIOutcomes?: unknown;

  @ApiPropertyOptional({ description: 'Activities breakdown as JSON' })
  @IsOptional()
  sectionIVActivities?: unknown;

  @ApiPropertyOptional({ description: 'Personnel/RACI matrix as JSON' })
  @IsOptional()
  sectionVPersonnel?: unknown;

  @ApiPropertyOptional({ description: 'Content/curriculum as JSON' })
  @IsOptional()
  sectionVIContent?: unknown;

  @ApiPropertyOptional({ description: 'Timeline/schedule as JSON' })
  @IsOptional()
  sectionVIITimeline?: unknown;

  @ApiPropertyOptional({ description: 'Proposal narrative text' })
  @IsOptional()
  @IsString()
  sectionVIIIProposal?: string;

  @ApiPropertyOptional({ description: 'Budget breakdown as JSON' })
  @IsOptional()
  sectionIXBudget?: unknown;
}

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Kế hoạch Trại Hè 2026 (updated)' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'camp', enum: ['camp', 'annual', 'training', 'event', 'custom'] })
  @IsOptional()
  @IsString()
  @IsIn(['camp', 'annual', 'training', 'event', 'custom'])
  planType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionIDescription?: string;

  @ApiPropertyOptional() @IsOptional() sectionIIObjectives?: unknown;
  @ApiPropertyOptional() @IsOptional() sectionIIIOutcomes?: unknown;
  @ApiPropertyOptional() @IsOptional() sectionIVActivities?: unknown;
  @ApiPropertyOptional() @IsOptional() sectionVPersonnel?: unknown;
  @ApiPropertyOptional() @IsOptional() sectionVIContent?: unknown;
  @ApiPropertyOptional() @IsOptional() sectionVIITimeline?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionVIIIProposal?: string;

  @ApiPropertyOptional() @IsOptional() sectionIXBudget?: unknown;
}

// ── Template DTOs (T-1024) ──

export class CreateTemplateDto {
  @ApiProperty({ example: 'Mẫu trại 3 ngày' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ example: 'Template cho trại hè...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'camp', enum: ['camp', 'annual', 'training', 'event', 'custom'] })
  @IsOptional()
  @IsString()
  @IsIn(['camp', 'annual', 'training', 'event', 'custom'])
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Snapshot of 9 sections as JSON' })
  templateData!: unknown;
}

export class CreatePlanFromTemplateDto {
  @ApiProperty()
  @IsUUID()
  templateId!: string;

  @ApiProperty({ example: 'Kế hoạch mới từ mẫu' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title!: string;
}

// ── Personnel / RACI (T-1027) ──

export class PersonnelEntryDto {
  @ApiProperty({ description: 'User/member ID' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ example: 'Trại trưởng' })
  @IsString()
  role!: string;

  @ApiProperty({ example: 'R', enum: ['R', 'A', 'C', 'I'], description: 'R=Responsible, A=Accountable, C=Consulted, I=Informed' })
  @IsString()
  @IsIn(['R', 'A', 'C', 'I'])
  raciType!: string;

  @ApiPropertyOptional({ example: 'Lãnh đạo chịu trách nhiệm chung' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Budget Lines (T-1029) ──

export class BudgetLineDto {
  @ApiProperty({ example: 'Vận chuyển' })
  @IsString()
  category!: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Thuê xe 45 chỗ' })
  @IsOptional()
  @IsString()
  description?: string;
}

// ── Transition ──

export class TransitionActionDto {
  @ApiProperty({ example: 'submit' })
  @IsString()
  action!: string;
}

// ── Comments (T-1034) ──

export class CreateCommentDto {
  @ApiProperty({ example: 'Cần bổ sung phần logistics' })
  @IsString()
  @MinLength(1)
  content!: string;

  @ApiPropertyOptional({ description: 'Task ID if commenting on a specific task' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}

// ── Kanban DnD (T-1032) ──

export class MoveTaskDto {
  @ApiProperty({ example: 'in_progress', enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'] })
  @IsString()
  @IsIn(['todo', 'in_progress', 'review', 'done', 'cancelled'])
  targetStatus!: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  targetPosition!: number;
}

// ── Risk Register (T-1035) ──

export class CreateRiskDto {
  @ApiProperty({ example: 'Thời tiết xấu ảnh hưởng trại' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'high', enum: ['low', 'medium', 'high', 'critical'] })
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity!: string;

  @ApiPropertyOptional({ example: 'medium', enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high'])
  probability?: string;

  @ApiPropertyOptional({ example: 'Chuẩn bị kế hoạch dự phòng trong nhà' })
  @IsOptional()
  @IsString()
  mitigation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdateRiskDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['low', 'medium', 'high', 'critical']) severity?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['low', 'medium', 'high']) probability?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() mitigation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['open', 'mitigated', 'closed', 'accepted']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
}

// ── Checklists (T-1035) ──

export class CreateChecklistDto {
  @ApiProperty({ example: 'Danh sách chuẩn bị trại' })
  @IsString()
  @MinLength(2)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ type: [String], example: ['Lều', 'Nước', 'Thuốc y tế'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];
}

export class ToggleChecklistItemDto {
  @ApiProperty({ example: 0, description: 'Index of item to toggle' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  itemIndex!: number;
}
