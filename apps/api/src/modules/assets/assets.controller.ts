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
    @Body() body: {
      name: string; description?: string; ownerType?: string;
      branchId?: string; icon?: string;
    },
  ) {
    return this.assetsService.createCategory(user.orgId, body, user.userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List asset categories with counts' })
  getCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.getCategories(user.orgId);
  }

  // ── Assets ──

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a new asset' })
  createAsset(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string; categoryId: string; assetCode: string;
      ownerType?: string; branchId?: string; condition?: string;
      quantity?: number; unit?: string; purchaseDate?: string;
      purchasePrice?: number; serialNumber?: string; location?: string;
      photoUrls?: string[]; notes?: string; managedBy?: string;
    },
  ) {
    return this.assetsService.createAsset(user.orgId, body, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List assets (paginated, filterable)' })
  getAssets(
    @CurrentUser() user: CurrentUserPayload,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('condition') condition?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.assetsService.getAssets(user.orgId, { categoryId, status, branchId, condition }, page ?? 1, limit ?? 20);
  }

  @Get('inventory')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get inventory summary by category' })
  getInventorySummary(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.getInventorySummary(user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID with recent loans' })
  getAssetById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.assetsService.getAssetById(user.orgId, id);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR code payload for asset' })
  getQrData(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.assetsService.getAssetById(user.orgId, id).then((asset) =>
      this.assetsService.getQrData(user.orgId, asset.id, asset.assetCode),
    );
  }

  // ── Loans ──

  @Post('loans')
  @ApiOperation({ summary: 'Request an asset loan' })
  createLoan(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      assetId: string; quantity?: number; borrowerId: string;
      purpose?: string; expectedReturn: string;
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
    return this.assetsService.transitionLoan(user.orgId, id, body.action, user.userId, {
      conditionOnReturn: body.conditionOnReturn,
      returnNotes: body.returnNotes,
    });
  }
}
