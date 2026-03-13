import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import { AssetsService } from './assets.service';
import {
  CreateCategoryDto, CreateAssetDto, UpdateAssetDto,
  CreateLoanDto, TransitionLoanDto, GuardianAcceptDto,
  SetCustomFieldDto, CreateKitTemplateDto, CreateMaintenanceDto,
  ImportAssetsDto, IssueUniformDto, ReturnUniformDto, DisposeAssetDto,
} from './assets.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  // ── Categories ──

  @Post('categories')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create asset category' })
  createCategory(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateCategoryDto) {
    return this.service.createCategory(user.orgId, dto, user.userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  getCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getCategories(user.orgId);
  }

  // ── Assets ──

  @Post()
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create asset' })
  createAsset(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateAssetDto) {
    return this.service.createAsset(user.orgId, dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List assets with filters' })
  getAssets(
    @CurrentUser() user: CurrentUserPayload,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('condition') condition?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.getAssets(user.orgId, { categoryId, status, branchId, condition }, page, limit);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get inventory summary by category' })
  getInventorySummary(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getInventorySummary(user.orgId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all assets as JSON' })
  exportAssets(@CurrentUser() user: CurrentUserPayload) {
    return this.service.exportAssets(user.orgId);
  }

  @Post('import')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Bulk import assets' })
  importAssets(@CurrentUser() user: CurrentUserPayload, @Body() dto: ImportAssetsDto) {
    return this.service.importAssets(user.orgId, dto.items, user.userId);
  }

  @Get('by-location')
  @ApiOperation({ summary: 'T-1085: Get assets by location' })
  getAssetsByLocation(@CurrentUser() user: CurrentUserPayload, @Query('location') location: string) {
    return this.service.getAssetsByLocation(user.orgId, location);
  }

  @Get('stock-alerts')
  @ApiOperation({ summary: 'T-1094: Get low-stock alerts' })
  getStockAlerts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('threshold', new DefaultValuePipe(5), ParseIntPipe) threshold?: number,
  ) {
    return this.service.getStockAlerts(user.orgId, threshold);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  getAssetById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.getAssetById(user.orgId, id);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1085: Update asset' })
  updateAsset(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.service.updateAsset(user.orgId, id, dto, user.userId);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1085: Retire/soft-delete asset' })
  retireAsset(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.retireAsset(user.orgId, id, user.userId);
  }

  @Post(':id/dispose')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1090: Dispose asset (donated/scrapped)' })
  disposeAsset(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: DisposeAssetDto) {
    return this.service.disposeAsset(user.orgId, id, dto, user.userId);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate QR data URL for asset' })
  generateQr(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.generateQrDataUrl(user.orgId, id);
  }

  // ── Custom Fields ──

  @Post(':id/custom-fields')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Set custom field on asset' })
  setCustomField(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: SetCustomFieldDto) {
    return this.service.setCustomField(user.orgId, id, dto.fieldName, dto.fieldValue, dto.fieldType);
  }

  // ── Loans ──

  @Post('loans')
  @ApiOperation({ summary: 'Create loan request' })
  createLoan(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateLoanDto) {
    return this.service.createLoan(user.orgId, dto, user.userId);
  }

  @Get('loans')
  @ApiOperation({ summary: 'List all loans' })
  getLoans(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('assetId') assetId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.getLoans(user.orgId, { status, assetId }, page, limit);
  }

  @Get('loans/overdue')
  @ApiOperation({ summary: 'T-1088: Get overdue loans' })
  getOverdueLoans(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getOverdueLoans(user.orgId);
  }

  @Post('loans/:loanId/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition loan state (approve/checkout/return/report_lost)' })
  transitionLoan(
    @CurrentUser() user: CurrentUserPayload,
    @Param('loanId') loanId: string,
    @Body() dto: TransitionLoanDto,
  ) {
    return this.service.transitionLoan(user.orgId, loanId, dto.action, user.userId, dto);
  }

  @Post('loans/:loanId/guardian-accept')
  @ApiOperation({ summary: 'T-1087: Guardian accept/reject loan for minor' })
  guardianAcceptLoan(
    @CurrentUser() user: CurrentUserPayload,
    @Param('loanId') loanId: string,
    @Body() dto: GuardianAcceptDto,
  ) {
    return this.service.guardianAcceptLoan(user.orgId, loanId, dto.decision, user.userId, dto.notes);
  }

  // ── Kit Templates ──

  @Post('kits')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create kit template' })
  createKitTemplate(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateKitTemplateDto) {
    return this.service.createKitTemplate(user.orgId, dto, user.userId);
  }

  @Get('kits')
  @ApiOperation({ summary: 'List kit templates' })
  getKitTemplates(@CurrentUser() user: CurrentUserPayload) {
    return this.service.getKitTemplates(user.orgId);
  }

  // ── Maintenance ──

  @Post('maintenance')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create maintenance schedule' })
  createMaintenance(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateMaintenanceDto) {
    return this.service.createMaintenanceSchedule(user.orgId, dto);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'List maintenance schedules' })
  getMaintenanceSchedules(@CurrentUser() user: CurrentUserPayload, @Query('status') status?: string) {
    return this.service.getMaintenanceSchedules(user.orgId, { status });
  }

  @Post('maintenance/:scheduleId/complete')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1089: Complete maintenance task and reschedule' })
  completeMaintenance(@CurrentUser() user: CurrentUserPayload, @Param('scheduleId') id: string) {
    return this.service.completeMaintenanceTask(user.orgId, id, user.userId);
  }

  // ── Uniform ──

  @Post('uniform/issue')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1092: Issue uniform to member' })
  issueUniform(@CurrentUser() user: CurrentUserPayload, @Body() dto: IssueUniformDto) {
    return this.service.issueUniform(user.orgId, dto, user.userId);
  }

  @Get('uniform')
  @ApiOperation({ summary: 'T-1092: List uniform issues' })
  getUniformIssues(
    @CurrentUser() user: CurrentUserPayload,
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getUniformIssues(user.orgId, { memberId, status });
  }

  @Post('uniform/:uniformId/return')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'T-1092: Return uniform' })
  returnUniform(
    @CurrentUser() user: CurrentUserPayload,
    @Param('uniformId') uniformId: string,
    @Body() dto: ReturnUniformDto,
  ) {
    return this.service.returnUniform(user.orgId, uniformId, dto, user.userId);
  }

  // ── T-1093: Pack/Unpack Checklists ──

  @Post('kits/:templateId/checklist')
  @ApiOperation({ summary: 'T-1093: Generate pack checklist from kit template' })
  generatePackChecklist(
    @CurrentUser() user: CurrentUserPayload,
    @Param('templateId') templateId: string,
    @Body('eventLabel') eventLabel?: string,
  ) {
    return this.service.generatePackChecklist(user.orgId, templateId, eventLabel);
  }

  // ── T-1098: CSV Export ──

  @Get('export/csv')
  @ApiOperation({ summary: 'T-1098: Export assets as CSV' })
  async exportAssetsCsv(@CurrentUser() user: CurrentUserPayload) {
    const csv = await this.service.exportAssetsCsv(user.orgId);
    return { csv, filename: `assets-export-${new Date().toISOString().split('T')[0]}.csv` };
  }

  @Get('loans/export/csv')
  @ApiOperation({ summary: 'T-1098: Export loans as CSV' })
  async exportLoansCsv(@CurrentUser() user: CurrentUserPayload) {
    const csv = await this.service.exportLoansCsv(user.orgId);
    return { csv, filename: `loans-export-${new Date().toISOString().split('T')[0]}.csv` };
  }
}
