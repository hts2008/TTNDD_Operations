import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { SyntheticProbeService } from './synthetic-probe.service';
import { AuthGuard, Public } from '../../core/auth';
import { OrgId } from '../../common/decorators';
import { SaveReleaseGateReportDto } from './system.dto';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(
    private readonly service: SystemService,
    private readonly probes: SyntheticProbeService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'API health check (no auth required)' })
  async health() {
    return this.service.getApiHealth();
  }

  @Public()
  @Get('health/canary')
  @ApiOperation({ summary: 'Canary endpoint for post-deploy verification' })
  async canary() {
    const probeStatus = this.probes.getOverallStatus();
    const apiHealth = await this.service.getApiHealth();
    return {
      status: probeStatus,
      api: apiHealth,
      buildId: process.env.K_REVISION || 'local',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health/probes')
  @ApiOperation({ summary: 'Detailed synthetic probe results' })
  async probeResults() {
    return {
      overall: this.probes.getOverallStatus(),
      probes: this.probes.getLastResults(),
    };
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
    @Body() body: SaveReleaseGateReportDto,
  ) {
    return this.service.saveReleaseGateReport(body);
  }
}

