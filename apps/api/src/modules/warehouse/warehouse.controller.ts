import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WarehouseSyncService } from './warehouse-sync.service';
import { AuthGuard } from '../../core/auth';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Warehouse')
@ApiBearerAuth()
@Controller('warehouse')
@UseGuards(AuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseSync: WarehouseSyncService) {}

  @Get('status')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get warehouse sync status (P7B T-0200)' })
  async getStatus() {
    return this.warehouseSync.getSyncStatus();
  }

  @Get('mappings')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get event→warehouse mappings (P7B T-0196)' })
  getMappings() {
    return this.warehouseSync.getMappings();
  }

  @Post('process')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Manually process an event for warehouse sync (P7B T-0197)' })
  async processEvent(
    @Body() body: { eventType: string; payload: Record<string, unknown> },
  ) {
    return this.warehouseSync.processEvent(body.eventType, body.payload);
  }

  // ── T-0198: SPICES coverage metrics ──

  @Get('spices-coverage')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get SPICES coverage metrics for warehouse analytics (T-0198)' })
  async getSpicesCoverage(@CurrentUser() user: CurrentUserPayload) {
    return this.warehouseSync.getSpicesCoverageMetrics(user.orgId);
  }

  // ── T-0200: Backfill jobs + partition rules ──

  @Get('backfill')
  @Roles('super_admin')
  @ApiOperation({ summary: 'List all backfill job configurations with partition rules (T-0200)' })
  getBackfillJobs() {
    return this.warehouseSync.getBackfillJobs();
  }

  @Post('backfill/:entityType')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Run backfill for a specific entity type (T-0200)' })
  async runBackfill(@Param('entityType') entityType: string) {
    return this.warehouseSync.runBackfill(entityType);
  }
}
