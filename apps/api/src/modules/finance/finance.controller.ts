import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import {
  CreateAccountDto,
  CreateTransactionDto,
  TransitionTransactionDto,
  CreateFeeDto,
  PayFeeDto,
  WaiveFeeDto,
  CreateCostCenterDto,
  CreateFeePlanDto,
  CreateSponsorDto,
} from './finance.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ── Accounts ──

  @Post('accounts')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create financial account' })
  createAccount(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateAccountDto) {
    return this.financeService.createAccount(user.orgId, dto, user.userId);
  }

  @Get('accounts')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List financial accounts' })
  getAccounts(
    @CurrentUser() user: CurrentUserPayload,
    @Query('accountType') accountType?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getAccounts(
      user.orgId,
      { accountType, isActive: isActive !== undefined ? isActive === 'true' : undefined },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get('accounts/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get account with recent transactions' })
  getAccountById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.financeService.getAccountById(user.orgId, id);
  }

  // ── Cost Centers (T-1061) ──

  @Post('cost-centers')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create cost center for budget tracking' })
  createCostCenter(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateCostCenterDto) {
    return this.financeService.createCostCenter(user.orgId, dto, user.userId);
  }

  @Get('cost-centers')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List all cost centers' })
  getCostCenters(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.getCostCenters(user.orgId);
  }

  // ── Transactions ──

  @Post('transactions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a financial transaction' })
  createTransaction(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateTransactionDto) {
    return this.financeService.createTransaction(user.orgId, dto, user.userId);
  }

  @Post('transactions/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition transaction status (SM-6)' })
  transitionTransaction(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: TransitionTransactionDto,
  ) {
    return this.financeService.transitionTransaction(user.orgId, id, dto.action, user.userId);
  }

  // ── Fees ──

  @Post('fees')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a member fee' })
  createFee(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateFeeDto) {
    return this.financeService.createFee(user.orgId, dto, user.userId);
  }

  @Post('fees/:id/pay')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Record payment for a fee (SM-7)' })
  payFee(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: PayFeeDto) {
    return this.financeService.payFee(user.orgId, id, dto.amount, dto.transactionId, user.userId);
  }

  @Post('fees/:id/mark-overdue')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Mark a fee overdue and emit overdue notice event (SM-7)' })
  markFeeOverdue(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.financeService.markFeeOverdue(user.orgId, id, user.userId);
  }

  @Post('fees/:id/waive')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Waive a fee with reason (T-1068)' })
  waiveFee(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: WaiveFeeDto,
  ) {
    return this.financeService.waiveFee(user.orgId, id, dto.reason, user.userId);
  }

  @Get('fees')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List fees (filterable)' })
  findFees(
    @CurrentUser() user: CurrentUserPayload,
    @Query('orgMemberId') orgMemberId?: string,
    @Query('status') status?: string,
    @Query('feeType') feeType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.findFees(
      user.orgId,
      { orgMemberId, status, feeType },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get('fees/member/:memberId')
  @ApiOperation({ summary: 'Get fee summary for a member' })
  getMemberFees(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.financeService.getMemberFees(user.orgId, memberId);
  }

  // ── Fee Plans (T-1066) ──

  @Post('fee-plans')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create recurring fee plan template' })
  createFeePlan(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateFeePlanDto) {
    return this.financeService.createFeePlan(user.orgId, dto, user.userId);
  }

  @Get('fee-plans')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List fee plans' })
  getFeePlans(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.getFeePlans(user.orgId);
  }

  // ── Sponsors (T-1069) ──

  @Post('sponsors')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Record sponsor or in-kind contribution' })
  createSponsor(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateSponsorDto) {
    return this.financeService.createSponsor(user.orgId, dto, user.userId);
  }

  @Get('sponsors')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List sponsors with summary' })
  getSponsors(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.getSponsorSummary(user.orgId);
  }

  // ── Reports ──

  @Get('summary')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get finance summary by category' })
  getFinanceSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Query('accountId') accountId?: string,
  ) {
    return this.financeService.getFinanceSummary(user.orgId, accountId);
  }

  @Get('projections')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Balance projections (T-1064)' })
  getProjections(@CurrentUser() user: CurrentUserPayload, @Query('days') days?: number) {
    return this.financeService.getBalanceProjections(user.orgId, days ?? 90);
  }

  @Get('budget-variance')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Budget vs actual variance report (T-1072)' })
  getBudgetVariance(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.getBudgetVariance(user.orgId);
  }

  @Get('parent-view/:memberId')
  @ApiOperation({ summary: 'Parent-scoped fee view (T-1070)' })
  getParentFeeView(@CurrentUser() user: CurrentUserPayload, @Param('memberId') memberId: string) {
    return this.financeService.getParentFeeView(user.orgId, memberId);
  }

  @Get('ledger')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List double-entry ledger entries' })
  getLedgerEntries(
    @CurrentUser() user: CurrentUserPayload,
    @Query('transactionId') transactionId?: string,
    @Query('accountId') accountId?: string,
    @Query('costCenterId') costCenterId?: string,
  ) {
    return this.financeService.getLedgerEntries(user.orgId, {
      transactionId,
      accountId,
      costCenterId,
    });
  }

  @Get('export/transactions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export transactions data (T-1065/T-1074)' })
  exportTransactions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('accountId') accountId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.financeService.exportTransactions(user.orgId, { accountId, fromDate, toDate });
  }

  @Get('reconciliation')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Reconcile account balances (T-1078)' })
  reconcile(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.reconcileBalances(user.orgId);
  }
}
