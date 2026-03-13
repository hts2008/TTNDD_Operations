import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth';
import { OrgId } from '../../core/auth/org-id.decorator';
import { UserId } from '../../core/auth/user-id.decorator';
import { AssetsService } from './assets.service';
import {
  CreateCategoryDto,
  CreateAssetDto,
  UpdateAssetDto,
  CreateLoanDto,
  TransitionLoanDto,
  GuardianAcceptDto,
  SetCustomFieldDto,
  CreateKitTemplateDto,
  CreateMaintenanceDto,
  ImportAssetsDto,
  IssueUniformDto,
  ReturnUniformDto,
  DisposeAssetDto,
} from './assets.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  // ── Categories ──

  @Post('categories')
  @ApiOperation({ summary: 'Create asset category' })
  createCategory(@OrgId() orgId: string, @UserId() userId: string, @Body() dto: CreateCategoryDto) {
    return this.service.createCategory(orgId, dto, userId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List categories' })
  getCategories(@OrgId() orgId: string) {
    return this.service.getCategories(orgId);
  }

  // ── Assets ──

  @Post()
  @ApiOperation({ summary: 'Create asset' })
  createAsset(@OrgId() orgId: string, @UserId() userId: string, @Body() dto: CreateAssetDto) {
    return this.service.createAsset(orgId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List assets with filters' })
  getAssets(
    @OrgId() orgId: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('condition') condition?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.getAssets(orgId, { categoryId, status, branchId, condition }, page, limit);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get inventory summary by category' })
  getInventorySummary(@OrgId() orgId: string) {
    return this.service.getInventorySummary(orgId);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export all assets as JSON' })
  exportAssets(@OrgId() orgId: string) {
    return this.service.exportAssets(orgId);
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import assets' })
  importAssets(@OrgId() orgId: string, @UserId() userId: string, @Body() dto: ImportAssetsDto) {
    return this.service.importAssets(orgId, dto.items, userId);
  }

  @Get('by-location')
  @ApiOperation({ summary: 'T-1085: Get assets by location' })
  getAssetsByLocation(@OrgId() orgId: string, @Query('location') location: string) {
    return this.service.getAssetsByLocation(orgId, location);
  }

  @Get('stock-alerts')
  @ApiOperation({ summary: 'T-1094: Get low-stock alerts' })
  getStockAlerts(
    @OrgId() orgId: string,
    @Query('threshold', new DefaultValuePipe(5), ParseIntPipe) threshold?: number,
  ) {
    return this.service.getStockAlerts(orgId, threshold);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  getAssetById(@OrgId() orgId: string, @Param('id') id: string) {
    return this.service.getAssetById(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'T-1085: Update asset' })
  updateAsset(
    @OrgId() orgId: string,
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.service.updateAsset(orgId, id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'T-1085: Retire/soft-delete asset' })
  retireAsset(@OrgId() orgId: string, @UserId() userId: string, @Param('id') id: string) {
    return this.service.retireAsset(orgId, id, userId);
  }

  @Post(':id/dispose')
  @ApiOperation({ summary: 'T-1090: Dispose asset (donated/scrapped)' })
  disposeAsset(
    @OrgId() orgId: string,
    @UserId() userId: string,
    @Param('id') id: string,
    @Body() dto: DisposeAssetDto,
  ) {
    return this.service.disposeAsset(orgId, id, dto, userId);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate QR data URL for asset' })
  generateQr(@OrgId() orgId: string, @Param('id') id: string) {
    return this.service.generateQrDataUrl(orgId, id);
  }

  // ── Custom Fields ──

  @Post(':id/custom-fields')
  @ApiOperation({ summary: 'Set custom field on asset' })
  setCustomField(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: SetCustomFieldDto) {
    return this.service.setCustomField(orgId, id, dto.fieldName, dto.fieldValue, dto.fieldType);
  }

  // ── Loans ──

  @Post('loans')
  @ApiOperation({ summary: 'Create loan request' })
  createLoan(@OrgId() orgId: string, @UserId() userId: string, @Body() dto: CreateLoanDto) {
    return this.service.createLoan(orgId, dto, userId);
  }

  @Get('loans')
  @ApiOperation({ summary: 'List all loans' })
  getLoans(
    @OrgId() orgId: string,
    @Query('status') status?: string,
    @Query('assetId') assetId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.getLoans(orgId, { status, assetId }, page, limit);
  }

  @Get('loans/overdue')
  @ApiOperation({ summary: 'T-1088: Get overdue loans' })
  getOverdueLoans(@OrgId() orgId: string) {
    return this.service.getOverdueLoans(orgId);
  }

  @Post('loans/:loanId/transition')
  @ApiOperation({ summary: 'Transition loan state (approve/checkout/return/report_lost)' })
  transitionLoan(
    @OrgId() orgId: string,
    @UserId() userId: string,
    @Param('loanId') loanId: string,
    @Body() dto: TransitionLoanDto,
  ) {
    return this.service.transitionLoan(orgId, loanId, dto.action, userId, dto);
  }

  @Post('loans/:loanId/guardian-accept')
  @ApiOperation({ summary: 'T-1087: Guardian accept/reject loan for minor' })
  guardianAcceptLoan(
    @OrgId() orgId: string,
    @UserId() guardianId: string,
    @Param('loanId') loanId: string,
    @Body() dto: GuardianAcceptDto,
  ) {
    return this.service.guardianAcceptLoan(orgId, loanId, dto.decision, guardianId, dto.notes);
  }

  // ── Kit Templates ──

  @Post('kits')
  @ApiOperation({ summary: 'Create kit template' })
  createKitTemplate(
    @OrgId() orgId: string,
    @UserId() userId: string,
    @Body() dto: CreateKitTemplateDto,
  ) {
    return this.service.createKitTemplate(orgId, dto, userId);
  }

  @Get('kits')
  @ApiOperation({ summary: 'List kit templates' })
  getKitTemplates(@OrgId() orgId: string) {
    return this.service.getKitTemplates(orgId);
  }

  // ── Maintenance ──

  @Post('maintenance')
  @ApiOperation({ summary: 'Create maintenance schedule' })
  createMaintenance(@OrgId() orgId: string, @Body() dto: CreateMaintenanceDto) {
    return this.service.createMaintenanceSchedule(orgId, dto);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'List maintenance schedules' })
  getMaintenanceSchedules(@OrgId() orgId: string, @Query('status') status?: string) {
    return this.service.getMaintenanceSchedules(orgId, { status });
  }

  @Post('maintenance/:scheduleId/complete')
  @ApiOperation({ summary: 'T-1089: Complete maintenance task and reschedule' })
  completeMaintenance(
    @OrgId() orgId: string,
    @UserId() userId: string,
    @Param('scheduleId') id: string,
  ) {
    return this.service.completeMaintenanceTask(orgId, id, userId);
  }

  // ── Uniform ──

  @Post('uniform/issue')
  @ApiOperation({ summary: 'T-1092: Issue uniform to member' })
  issueUniform(@OrgId() orgId: string, @UserId() userId: string, @Body() dto: IssueUniformDto) {
    return this.service.issueUniform(orgId, dto, userId);
  }

  @Get('uniform')
  @ApiOperation({ summary: 'T-1092: List uniform issues' })
  getUniformIssues(
    @OrgId() orgId: string,
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getUniformIssues(orgId, { memberId, status });
  }

  @Post('uniform/:uniformId/return')
  @ApiOperation({ summary: 'T-1092: Return uniform' })
  returnUniform(
    @OrgId() orgId: string,
    @UserId() userId: string,
    @Param('uniformId') uniformId: string,
    @Body() dto: ReturnUniformDto,
  ) {
    return this.service.returnUniform(orgId, uniformId, dto, userId);
  }
}
