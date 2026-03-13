import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsBoolean,
  IsDateString,
  Min,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ── Categories ──

export class CreateCategoryDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() icon?: string;
}

// ── Assets ──

export class CreateAssetDto {
  @ApiProperty() @IsString() @IsNotEmpty() assetCode!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() categoryId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() condition?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() purchaseDate?: string;
  @ApiPropertyOptional() @IsOptional() purchasePrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) photoUrls?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managedBy?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() condition?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managedBy?: string;
}

// ── Loans ──

export class CreateLoanDto {
  @ApiProperty() @IsString() @IsNotEmpty() assetId!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quantity?: number;
  @ApiProperty() @IsString() @IsNotEmpty() borrowerId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
  @ApiProperty() @IsDateString() expectedReturn!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isBorrowerMinor?: boolean;
}

export class TransitionLoanDto {
  @ApiProperty({ description: 'Action: approve, checkout, return, report_lost' })
  @IsString()
  @IsNotEmpty()
  action!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() conditionOnReturn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() returnNotes?: string;
}

export class GuardianAcceptDto {
  @ApiProperty({ description: 'accept or reject' })
  @IsString()
  @IsNotEmpty()
  decision!: string; // 'accept' | 'reject'
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── Custom Fields ──

export class SetCustomFieldDto {
  @ApiProperty() @IsString() @IsNotEmpty() fieldName!: string;
  @ApiProperty() @IsString() fieldValue!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fieldType?: string;
}

// ── Kit Templates ──

export class KitItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() itemName!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateKitTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() kitType?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KitItemDto)
  items?: KitItemDto[];
}

// ── Maintenance ──

export class CreateMaintenanceDto {
  @ApiProperty() @IsString() @IsNotEmpty() assetId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() maintenanceType!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() frequency?: string;
  @ApiProperty() @IsDateString() nextDue!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── Import ──

export class ImportAssetItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() assetCode!: string;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() categoryId!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() condition?: string;
}

export class ImportAssetsDto {
  @ApiProperty({ type: [ImportAssetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportAssetItemDto)
  items!: ImportAssetItemDto[];
}

// ── Uniform ──

export class IssueUniformDto {
  @ApiProperty() @IsString() @IsNotEmpty() memberId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() uniformType!: string;
  @ApiProperty() @IsString() @IsNotEmpty() size!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() issuedDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ReturnUniformDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string; // returned, lost, damaged
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── Dispose ──

export class DisposeAssetDto {
  @ApiProperty({ description: 'retired | donated | scrapped' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
