import {
  IsString,
  IsOptional,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Member Profile DTO ───────────────────────────────────────────────

export class CreateMemberProfileDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiPropertyOptional({ example: '2012-08-22' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'Q.1, TP. HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  personalPhone?: string;

  @ApiPropertyOptional({ example: 'an@email.com' })
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @ApiPropertyOptional({ example: 'Trần Thị Mẹ' })
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional({ example: '0909876543' })
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional({ example: 'mother' })
  @IsOptional()
  @IsString()
  guardianRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  healthNotes?: string;

  @ApiPropertyOptional({ example: '0901234999' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

export class UpdateMemberProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  personalPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  healthNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

// ─── Member Create DTO ────────────────────────────────────────────────

export class CreateMemberDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: 'member', enum: ['member', 'leader', 'admin'] })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({ example: 'DS-001' })
  @IsOptional()
  @IsString()
  memberCode?: string;

  @ApiPropertyOptional({ example: 'Sơn Ca' })
  @IsOptional()
  @IsString()
  scoutName?: string;

  @ApiPropertyOptional({ example: 'Chiến binh Ánh Sáng' })
  @IsOptional()
  @IsString()
  heroName?: string;

  @ApiProperty({ type: CreateMemberProfileDto })
  @ValidateNested()
  @Type(() => CreateMemberProfileDto)
  profile!: CreateMemberProfileDto;
}

// ─── Transition DTO ───────────────────────────────────────────────────

export const ALLOWED_ACTIONS = [
  'approve',
  'reject',
  'voluntary_pause',
  'resume',
  'discipline',
  'reinstate',
  'branch_transition',
  'accept_in_new_branch',
  'offboarding',
] as const;

export type MemberAction = (typeof ALLOWED_ACTIONS)[number];

export class TransitionStatusDto {
  @ApiProperty({ example: 'approve', enum: ALLOWED_ACTIONS })
  @IsString()
  @IsNotEmpty()
  action!: string;
}

// ─── Transfer DTO ─────────────────────────────────────────────────────

export class TransferMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toBranchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toUnitId?: string;

  @ApiPropertyOptional({ example: 'Chuyển do thay đổi nơi sinh hoạt' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Unit Assignment DTO ──────────────────────────────────────────────

export class AssignUnitDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

// ─── Transfer Sign DTO ────────────────────────────────────────────────

export class SignTransferDto {
  @ApiProperty({ example: 'Xác nhận tiếp nhận đoàn sinh' })
  @IsString()
  @IsNotEmpty()
  signatureNote!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  accepted?: boolean;
}

// ─── Filter DTO ───────────────────────────────────────────────────────

export class MemberFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
