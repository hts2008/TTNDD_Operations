import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Reusable pagination query DTO for list endpoints.
 *
 * Usage:
 *   @Get()
 *   findAll(@Query() query: PaginationQueryDto) { ... }
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  /** Prisma-compatible skip value */
  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  /** Prisma-compatible take value */
  get take(): number {
    return this.limit;
  }

  /** Prisma-compatible orderBy object (if sortBy is set) */
  get orderBy(): Record<string, 'asc' | 'desc'> | undefined {
    if (!this.sortBy) return undefined;
    return { [this.sortBy]: this.sortOrder ?? 'desc' };
  }
}

/**
 * Paginated response envelope.
 *
 * Usage:
 *   return PaginatedResponseDto.from(items, total, query);
 */
export class PaginatedResponseDto<T> {
  data!: T[];
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  static from<T>(
    data: T[],
    total: number,
    query: PaginationQueryDto,
  ): PaginatedResponseDto<T> {
    const dto = new PaginatedResponseDto<T>();
    dto.data = data;
    dto.meta = {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
    return dto;
  }
}
