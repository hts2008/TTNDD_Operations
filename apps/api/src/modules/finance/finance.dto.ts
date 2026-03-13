import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ── Fee Plans ──

export class CreateFeePlanDto {
  @ApiProperty({ example: 'Phí sinh hoạt hàng tháng' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'monthly_fee' })
  @IsString()
  feeType!: string;

  @ApiProperty({ example: 300000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional({ example: 'monthly', enum: ['monthly', 'quarterly', 'annual', 'one-time'] })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  effectiveDate!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// ── Accounts ──

export class CreateAccountDto {
  @ApiProperty({ example: 'Quỹ hoạt động chính' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'operating' })
  @IsOptional()
  @IsString()
  accountType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

// ── Cost Centers ──

export class CreateCostCenterDto {
  @ApiProperty({ example: 'CC-001' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Chi phí hoạt động Chi nhánh 1' })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

// ── Transactions ──

export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  accountId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  costCenterId?: string;

  @ApiProperty({ example: 'income' })
  @IsString()
  transactionType!: string;

  @ApiPropertyOptional({ example: 'Phí sinh hoạt' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiProperty({ example: 'Thu phí sinh hoạt tháng 3' })
  @IsString()
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNo?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  transactionDate!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  receiptUrls?: string[];
}

// ── Fees ──

export class CreateFeeDto {
  @ApiProperty()
  @IsUUID()
  orgMemberId!: string;

  @ApiPropertyOptional({ example: 'monthly_fee' })
  @IsOptional()
  @IsString()
  feeType?: string;

  @ApiPropertyOptional({ example: 'Q1/2026' })
  @IsOptional()
  @IsString()
  feePeriod?: string;

  @ApiProperty({ example: 300000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amountDue!: number;

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  feePlanId?: string;
}

export class PayFeeDto {
  @ApiProperty({ example: 300000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  transactionId?: string;
}

export class RequestWaiverDto {
  @ApiProperty({ example: 'Gia đình khó khăn — xin miễn phí 50%' })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Campership amount to cover (partial waiver)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  campershapAmount?: number;
}

export class ApplyFeePlanDto {
  @ApiProperty({ description: 'List of member IDs to apply the fee plan to', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds!: string[];

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class TransitionDto {
  @ApiProperty({ example: 'approve' })
  @IsString()
  action!: string;
}
