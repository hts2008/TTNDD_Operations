import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import {
  CreateAccountDto,
  CreateTransactionDto,
  TransitionDto,
  CreateFeeDto,
  PayFeeDto,
  CreateFeePlanDto,
  ApplyFeePlanDto,
  RequestWaiverDto,
  CreateCostCenterDto,
} from './finance.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ── Cost Centers ──

  @Post('cost-centers')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a cost center' })
  createCostCenter(@CurrentUser() user: CurrentUserPayload, @Body() body: CreateCostCenterDto) {
    return this.financeService.createCostCenter(user.orgId, body, user.userId);
  }

  @Get('cost-centers')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List cost centers' })
  getCostCenters(
    @CurrentUser() user: CurrentUserPayload,
    @Query('isActive') isActive?: string,
    @Query('parentId') parentId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getCostCenters(
      user.orgId,
      {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        parentId,
      },
      page ?? 1,
      limit ?? 50,
    );
  }

  @Get('cost-centers/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get cost center with transactions' })
  getCostCenterById(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.financeService.getCostCenterById(user.orgId, id);
  }

  // ── Accounts ──

  @Post('accounts')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create financial account' })
  createAccount(@CurrentUser() user: CurrentUserPayload, @Body() body: CreateAccountDto) {
    return this.financeService.createAccount(user.orgId, body, user.userId);
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

  // ── Transactions ──

  @Post('transactions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a financial transaction' })
  createTransaction(@CurrentUser() user: CurrentUserPayload, @Body() body: CreateTransactionDto) {
    return this.financeService.createTransaction(user.orgId, body, user.userId);
  }

  @Post('transactions/:id/transition')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Transition transaction status (SM-6)' })
  transitionTransaction(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: TransitionDto,
  ) {
    return this.financeService.transitionTransaction(user.orgId, id, body.action, user.userId);
  }

  // ── Fee Plans ──

  @Post('fee-plans')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a fee plan (schedule)' })
  createFeePlan(@CurrentUser() user: CurrentUserPayload, @Body() body: CreateFeePlanDto) {
    return this.financeService.createFeePlan(user.orgId, body, user.userId);
  }

  @Get('fee-plans')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List fee plans' })
  getFeePlans(
    @CurrentUser() user: CurrentUserPayload,
    @Query('isActive') isActive?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getFeePlans(
      user.orgId,
      { isActive: isActive !== undefined ? isActive === 'true' : undefined },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Post('fee-plans/:id/apply')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Apply a fee plan to multiple members' })
  applyFeePlan(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: ApplyFeePlanDto,
  ) {
    return this.financeService.applyFeePlanToMembers(
      user.orgId,
      id,
      body.memberIds,
      body.dueDate,
      user.userId,
    );
  }

  // ── Fees ──

  @Post('fees')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a member fee' })
  createFee(@CurrentUser() user: CurrentUserPayload, @Body() body: CreateFeeDto) {
    return this.financeService.createFee(user.orgId, body, user.userId);
  }

  @Post('fees/:id/pay')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Record payment for a fee (SM-7)' })
  payFee(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: PayFeeDto,
  ) {
    return this.financeService.payFee(user.orgId, id, body.amount, body.transactionId, user.userId);
  }

  @Post('fees/:id/installments')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Generate installment schedule for a fee' })
  createInstallments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body('count') count: number,
  ) {
    return this.financeService.createInstallments(user.orgId, id, count, user.userId);
  }

  @Post('fees/:id/waiver')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Request a waiver/campership for a fee' })
  requestWaiver(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: RequestWaiverDto,
  ) {
    return this.financeService.requestWaiver(
      user.orgId,
      id,
      body.reason,
      body.campershapAmount,
      user.userId,
    );
  }

  @Post('fees/:id/waiver/approve')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Approve a waiver request' })
  approveWaiver(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.financeService.approveWaiver(user.orgId, id, user.userId);
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
  @ApiOperation({ summary: 'Get balance projections (T-1064)' })
  getBalanceProjections(@CurrentUser() user: CurrentUserPayload, @Query('months') months?: number) {
    return this.financeService.getBalanceProjections(user.orgId, months ?? 6);
  }

  @Get('export')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Export transactions as CSV-ready data (T-1065)' })
  exportTransactions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('accountId') accountId?: string,
    @Query('costCenterId') costCenterId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.financeService.exportTransactions(user.orgId, {
      accountId,
      costCenterId,
      status,
      fromDate,
      toDate,
    });
  }

  @Get('budget-variance')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get budget variance report (T-1072)' })
  getBudgetVariance(@CurrentUser() user: CurrentUserPayload, @Query('period') period?: string) {
    return this.financeService.getBudgetVariance(user.orgId, period);
  }

  @Get('reconciliation')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get reconciliation report (T-1078)' })
  getReconciliationReport(@CurrentUser() user: CurrentUserPayload) {
    return this.financeService.getReconciliationReport(user.orgId);
  }

  // ── Sponsors ──

  @Post('sponsors')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a sponsor' })
  createSponsor(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      name: string;
      contactEmail?: string;
      contactPhone?: string;
      sponsorType?: string;
      description?: string;
    },
  ) {
    return this.financeService.createSponsor(user.orgId, body, user.userId);
  }

  @Get('sponsors')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'List sponsors' })
  getSponsors(
    @CurrentUser() user: CurrentUserPayload,
    @Query('isActive') isActive?: string,
    @Query('sponsorType') sponsorType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getSponsors(
      user.orgId,
      { isActive: isActive !== undefined ? isActive === 'true' : undefined, sponsorType },
      page ?? 1,
      limit ?? 20,
    );
  }

  @Post('sponsors/:id/contributions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Record a sponsor contribution' })
  recordContribution(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body()
    body: {
      contributionType: string;
      amount?: number;
      inKindDescription?: string;
      inKindEstValue?: number;
      transactionId?: string;
      receivedDate: string;
      notes?: string;
    },
  ) {
    return this.financeService.recordContribution(user.orgId, id, body, user.userId);
  }
}
