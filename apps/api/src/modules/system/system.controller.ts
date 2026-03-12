import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { FeatureFlagService } from './feature-flag.service';
import { AuthGuard } from '../../core/auth';
import { OrgId, CurrentUser, type CurrentUserPayload } from '../../common/decorators';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(
    private readonly service: SystemService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

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

  @Get('activation-blockers')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get activation blockers for the org (T-0195)' })
  async activationBlockers(@OrgId() orgId: string) {
    return this.service.getActivationBlockers(orgId);
  }

  @Post('coverage-reports')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ingest CI coverage report artifact (T-0193)' })
  async ingestCoverage(
    @Body() body: { buildId: string; commitSha?: string; reportJson: object },
  ) {
    return this.service.ingestCoverageReport(body);
  }

  @Get('feature-flags')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all feature flags for the org (T-0194)' })
  async listFlags(@OrgId() orgId: string) {
    return this.featureFlags.getAllFlags(orgId);
  }

  @Put('feature-flags/:key')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle a feature flag (T-0194)' })
  async toggleFlag(
    @OrgId() orgId: string,
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.featureFlags.setFlag(orgId, key, body.enabled, user.userId);
  }

  @Delete('feature-flags/:key')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset feature flag to default (T-0194)' })
  async resetFlag(
    @OrgId() orgId: string,
    @Param('key') key: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.featureFlags.resetFlag(orgId, key, user.userId);
  }
}
