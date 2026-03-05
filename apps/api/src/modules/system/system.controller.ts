import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { AuthGuard } from '../../core/auth';
import { OrgId } from '../../common/decorators';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly service: SystemService) {}

  @Get('health')
  @ApiOperation({ summary: 'API health check (no auth required)' })
  async health() {
    return this.service.getApiHealth();
  }

  @Get('module-health')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check readiness of all modules for the org' })
  async moduleHealth(@OrgId() orgId: string) {
    return this.service.getModuleHealth(orgId);
  }

  @Get('seed-health')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check seed data completeness for the org' })
  async seedHealth(@OrgId() orgId: string) {
    return this.service.getSeedHealth(orgId);
  }

  @Get('release-gates/latest')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get latest release gate report' })
  async latestReleaseGate() {
    return this.service.getLatestReleaseGate();
  }

  @Post('release-gates/report')
  @ApiOperation({ summary: 'Save a release gate report from CI pipeline' })
  async saveReleaseGateReport(
    @Body() body: {
      environment: string;
      buildId?: string;
      commitSha?: string;
      profile: string;
      status: string;
      reportJson: object;
      linksJson?: object;
    },
  ) {
    return this.service.saveReleaseGateReport(body);
  }
}
