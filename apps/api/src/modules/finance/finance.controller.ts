import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CurrentUser, type CurrentUserPayload, Roles } from '../../common/decorators';
import {
  CreateAccountDto, CreateTransactionDto, TransitionTransactionDto,
  CreateFeeDto, PayFeeDto,
} from './finance.dto';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ── Accounts ──

  @Post('accounts')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create financial account' })
  createAccount(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateAccountDto,
  ) {
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
      page ?? 1, limit ?? 20,
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
  createTransaction(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTransactionDto,
  ) {
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
  createFee(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFeeDto,
  ) {
    return this.financeService.createFee(user.orgId, dto, user.userId);
  }

  @Post('fees/:id/pay')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Record payment for a fee (SM-7)' })
  payFee(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: PayFeeDto,
  ) {
    return this.financeService.payFee(user.orgId, id, dto.amount, dto.transactionId, user.userId);
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
    return this.financeService.findFees(user.orgId, { orgMemberId, status, feeType }, page ?? 1, limit ?? 20);
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
}
