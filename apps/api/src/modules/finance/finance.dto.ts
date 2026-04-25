import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Accounts ──

export class CreateAccountDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() accountType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

// ── Cost Centers ──

export class CreateCostCenterDto {
  @ApiProperty({ example: 'Trại huấn luyện 2026' }) @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() parentId?: string;
  @ApiProperty({ example: 15000000 }) @IsNumber() @Min(0) budgetAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

// ── Transactions ──

export class CreateTransactionDto {
  @ApiProperty() @IsString() @IsNotEmpty() accountId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() transactionType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() costCenterId?: string;
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sourceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNo?: string;
  @ApiProperty() @IsDateString() transactionDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) receiptUrls?: string[];
}

export class TransitionTransactionDto {
  @ApiProperty({ description: 'Action: approve, reject, complete, reverse' })
  @IsString()
  @IsNotEmpty()
  action!: string;
}

// ── Fees ──

export class CreateFeeDto {
  @ApiProperty() @IsString() @IsNotEmpty() orgMemberId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() feePeriod?: string;
  @ApiProperty() @IsNumber() @Min(0) amountDue!: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class PayFeeDto {
  @ApiProperty() @IsNumber() @Min(0) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() transactionId?: string;
}

export class WaiveFeeDto {
  @ApiProperty({ example: 'Hoàn cảnh khó khăn — miễn phí sinh hoạt Q2' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() approvedBy?: string;
}

// ── Fee Plans ──

export class CreateFeePlanDto {
  @ApiProperty({ example: 'Phí sinh hoạt hàng quý' }) @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ example: 'quarterly', description: 'monthly | quarterly | yearly | one_time' })
  @IsString()
  @IsNotEmpty()
  frequency!: string;
  @ApiProperty({ example: 300000 }) @IsNumber() @Min(0) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() feeType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() startDate?: string;
}

// ── Sponsors ──

export class CreateSponsorDto {
  @ApiProperty({ example: 'Ban Đại Diện Phụ Huynh' }) @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ example: 'cash', description: 'cash | in_kind' })
  @IsString()
  @IsNotEmpty()
  contributionType!: string;
  @ApiProperty({ example: 7500000 }) @IsNumber() @Min(0) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receivedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contactInfo?: string;
}
