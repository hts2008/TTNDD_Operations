import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ── Categories ──

  @Post('categories')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create asset category' })
  createCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { name: string; description?: string; ownerType?: string; icon?: string },
  ) {
    return this.assetsService.createCategory(user.orgId, body, user.userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List asset categories' })
  getCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.getCategories(user.orgId);
  }

  // ── Assets ──

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create asset' })
  createAsset(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      assetCode: string;
      name: string;
      categoryId: string;
      quantity?: number;
      unit?: string;
      location?: string;
      serialNumber?: string;
      notes?: string;
      condition?: string;
    },
  ) {
    return this.assetsService.createAsset(user.orgId, body, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List assets' })
  getAssets(
    @CurrentUser() user: CurrentUserPayload,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.assetsService.getAssets(user.orgId, { categoryId, status }, page ?? 1, limit ?? 20);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get inventory summary' })
  getInventorySummary(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.getInventorySummary(user.orgId);
  }

  @Get('export')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export all assets as JSON' })
  exportAssets(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.exportAssets(user.orgId);
  }

  @Post('import')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Bulk import assets from JSON array' })
  importAssets(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      items: Array<{
        assetCode: string;
        name: string;
        categoryId: string;
        quantity?: number;
        unit?: string;
        location?: string;
        serialNumber?: string;
        notes?: string;
        condition?: string;
      }>;
    },
  ) {
    return this.assetsService.importAssets(user.orgId, body.items, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset details' })
  getAssetById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.assetsService.getAssetById(user.orgId, id);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate QR code data URL for an asset' })
  getAssetQr(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.assetsService.generateQrDataUrl(user.orgId, id);
  }

  // ── Custom Fields ──

  @Post(':id/custom-fields')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Set a custom field on an asset' })
  setCustomField(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { fieldName: string; fieldValue: string; fieldType?: string },
  ) {
    return this.assetsService.setCustomField(
      user.orgId,
      id,
      body.fieldName,
      body.fieldValue,
      body.fieldType,
    );
  }

  // ── Loans ──

  @Post('loans')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create an asset loan request' })
  createLoan(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      assetId: string;
      quantity?: number;
      borrowerId: string;
      purpose?: string;
      expectedReturn: string;
    },
  ) {
    return this.assetsService.createLoan(user.orgId, body, user.userId);
  }

  @Post('loans/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition loan status (SM-8)' })
  transitionLoan(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { action: string; conditionOnReturn?: string; returnNotes?: string },
  ) {
    return this.assetsService.transitionLoan(user.orgId, id, body.action, user.userId, body);
  }

  // ── Kit Templates ──

  @Post('kits')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a kit template' })
  createKitTemplate(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      description?: string;
      kitType?: string;
      items?: Array<{ itemName: string; quantity?: number; isRequired?: boolean; notes?: string }>;
    },
  ) {
    return this.assetsService.createKitTemplate(user.orgId, body, user.userId);
  }

  @Get('kits')
  @ApiOperation({ summary: 'List active kit templates' })
  getKitTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.getKitTemplates(user.orgId);
  }

  // ── Maintenance ──

  @Post('maintenance')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a maintenance schedule' })
  createMaintenance(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      assetId: string;
      maintenanceType: string;
      frequency?: string;
      nextDue: string;
      assignedTo?: string;
      notes?: string;
    },
  ) {
    return this.assetsService.createMaintenanceSchedule(user.orgId, body);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'List maintenance schedules' })
  getMaintenanceSchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
  ) {
    return this.assetsService.getMaintenanceSchedules(user.orgId, { status });
  }
}
