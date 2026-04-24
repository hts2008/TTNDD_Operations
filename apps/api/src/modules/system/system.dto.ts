import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveReleaseGateReportDto {
  @ApiProperty({ description: 'Deployment environment (staging, production)' })
  @IsString()
  environment!: string;

  @ApiPropertyOptional({ description: 'CI build identifier' })
  @IsOptional()
  @IsString()
  buildId?: string;

  @ApiPropertyOptional({ description: 'Git commit SHA' })
  @IsOptional()
  @IsString()
  commitSha?: string;

  @ApiProperty({ description: 'Release profile (PROFILE_OPS, PROFILE_FULL)' })
  @IsString()
  profile!: string;

  @ApiProperty({ description: 'Gate status (pass, fail, partial)' })
  @IsString()
  status!: string;

  @ApiProperty({ description: 'Full release gate report as JSON' })
  @IsObject()
  reportJson!: object;

  @ApiPropertyOptional({ description: 'Links to CI artifacts, dashboards, etc.' })
  @IsOptional()
  @IsObject()
  linksJson?: object;
}
