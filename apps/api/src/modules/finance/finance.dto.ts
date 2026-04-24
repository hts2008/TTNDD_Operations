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

// ── Transactions ──

export class CreateTransactionDto {
  @ApiProperty() @IsString() @IsNotEmpty() accountId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() transactionType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
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
