import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

/**
 * SM-6: Transaction Lifecycle
 * pending → approved → completed → reversed
 */
const TRANSACTION_TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { approve: 'approved', reject: 'rejected' },
  approved: { complete: 'completed', reverse: 'reversed' },
  completed: { reverse: 'reversed' },
};

/**
 * SM-7: Fee Payment Lifecycle
 * unpaid → partial → paid → waived
 *       → overdue
 */
const FEE_TRANSITIONS: Record<string, Record<string, string>> = {
  unpaid: { pay_partial: 'partial', pay_full: 'paid', waive: 'waived', mark_overdue: 'overdue' },
  partial: { pay_full: 'paid', waive: 'waived', mark_overdue: 'overdue' },
  overdue: { pay_partial: 'partial', pay_full: 'paid', waive: 'waived' },
};

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Cost Centers ──

  async createCostCenter(
    orgId: string,
    data: {
      code: string;
      name: string;
      description?: string;
      parentId?: string;
      branchId?: string;
    },
    actorUserId: string,
  ) {
    const costCenter = await this.prisma.costCenter.create({
      data: { orgId, ...data },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.cost_center_created',
      resource: 'CostCenter',
      resourceId: costCenter.id,
    });

    return costCenter;
  }

  async getCostCenters(
    orgId: string,
    filters?: { isActive?: boolean; parentId?: string },
    page = 1,
    limit = 50,
  ) {
    const where: Prisma.CostCenterWhereInput = { orgId };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.parentId) where.parentId = filters.parentId;

    const [data, total] = await Promise.all([
      this.prisma.costCenter.findMany({
        where,
        include: { children: true, _count: { select: { transactions: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { code: 'asc' },
      }),
      this.prisma.costCenter.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async getCostCenterById(orgId: string, costCenterId: string) {
    const cc = await this.prisma.costCenter.findFirst({
      where: { id: costCenterId, orgId },
      include: { children: true, transactions: { take: 20, orderBy: { transactionDate: 'desc' } } },
    });
    if (!cc) throw new NotFoundException('Cost center not found');
    return cc;
  }

  // ── Accounts ──

  async createAccount(
    orgId: string,
    data: {
      name: string;
      accountType?: string;
      branchId?: string;
      currency?: string;
      description?: string;
    },
    actorUserId: string,
  ) {
    const account = await this.prisma.financialAccount.create({
      data: { orgId, ...data },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.account_created',
      resource: 'FinancialAccount',
      resourceId: account.id,
    });

    return account;
  }

  async getAccounts(
    orgId: string,
    filters?: { accountType?: string; isActive?: boolean },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.FinancialAccountWhereInput = { orgId };
    if (filters?.accountType) where.accountType = filters.accountType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [data, total] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where,
        include: { _count: { select: { transactions: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.financialAccount.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async getAccountById(orgId: string, accountId: string) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, orgId },
      include: { transactions: { take: 20, orderBy: { transactionDate: 'desc' } } },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  // ── Transactions ──

  async createTransaction(
    orgId: string,
    data: {
      accountId: string;
      transactionType: string;
      category?: string;
      amount: number;
      description: string;
      sourceType?: string;
      sourceId?: string;
      referenceNo?: string;
      transactionDate: string;
      receiptUrls?: string[];
      costCenterId?: string;
    },
    actorUserId: string,
  ) {
    const account = await this.getAccountById(orgId, data.accountId);
    if (!account.isActive) {
      throw new BadRequestException('Cannot create transaction on inactive account');
    }

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        orgId,
        accountId: data.accountId,
        costCenterId: data.costCenterId,
        transactionType: data.transactionType,
        category: data.category,
        amount: data.amount,
        description: data.description,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        referenceNo: data.referenceNo,
        transactionDate: new Date(data.transactionDate),
        receiptUrls: data.receiptUrls ?? [],
        recordedBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.transaction_created',
      resource: 'FinancialTransaction',
      resourceId: transaction.id,
      newValue: {
        amount: data.amount,
        type: data.transactionType,
      } as unknown as Prisma.InputJsonValue,
    });

    return transaction;
  }

  async transitionTransaction(
    orgId: string,
    transactionId: string,
    action: string,
    actorUserId: string,
  ) {
    const tx = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, orgId },
    });
    if (!tx) throw new NotFoundException('Transaction not found');

    const allowed = TRANSACTION_TRANSITIONS[tx.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${tx.status}'`);
    }
    const newStatus = allowed[action];

    const updateData: Prisma.FinancialTransactionUpdateInput = { status: newStatus };
    if (action === 'approve') updateData.approvedBy = actorUserId;

    const updated = await this.prisma.financialTransaction.update({
      where: { id: transactionId },
      data: updateData,
    });

    if (newStatus === 'completed') {
      const delta = tx.transactionType === 'income' ? tx.amount : tx.amount.negated();

      await this.prisma.financialAccount.update({
        where: { id: tx.accountId },
        data: { currentBalance: { increment: delta } },
      });

      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.FINANCE.TRANSACTION_COMPLETED,
        aggregateId: transactionId,
        aggregateType: 'FinancialTransaction',
        payload: {
          amount: tx.amount.toString(),
          type: tx.transactionType,
          accountId: tx.accountId,
        },
        actorUserId,
      });
    }

    if (newStatus === 'reversed' && tx.status === 'completed') {
      const reverseDelta = tx.transactionType === 'income' ? tx.amount.negated() : tx.amount;

      await this.prisma.financialAccount.update({
        where: { id: tx.accountId },
        data: { currentBalance: { increment: reverseDelta } },
      });
    }

    return updated;
  }

  // ── Fees ──

  async createFee(
    orgId: string,
    data: {
      orgMemberId: string;
      feeType?: string;
      feePeriod?: string;
      amountDue: number;
      dueDate?: string;
      notes?: string;
    },
    actorUserId: string,
  ) {
    const fee = await this.prisma.memberFee.create({
      data: {
        orgId,
        orgMemberId: data.orgMemberId,
        feeType: data.feeType,
        feePeriod: data.feePeriod,
        amountDue: data.amountDue,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.FINANCE.FEE_CREATED,
      aggregateId: fee.id,
      aggregateType: 'MemberFee',
      payload: { memberId: data.orgMemberId, amountDue: data.amountDue, feeType: data.feeType },
      actorUserId,
    });

    return fee;
  }

  async payFee(
    orgId: string,
    feeId: string,
    paymentAmount: number,
    transactionId: string | undefined,
    actorUserId: string,
  ) {
    const fee = await this.prisma.memberFee.findFirst({ where: { id: feeId, orgId } });
    if (!fee) throw new NotFoundException('Fee not found');

    const allowed = FEE_TRANSITIONS[fee.status];
    if (!allowed) throw new BadRequestException(`Fee in '${fee.status}' cannot accept payments`);

    const newAmountPaid = fee.amountPaid.add(new Prisma.Decimal(paymentAmount));
    const isFullyPaid = newAmountPaid.gte(fee.amountDue);
    const action = isFullyPaid ? 'pay_full' : 'pay_partial';

    if (!allowed[action]) {
      throw new BadRequestException(`Payment action '${action}' not allowed from '${fee.status}'`);
    }
    const newStatus = allowed[action];

    const updated = await this.prisma.memberFee.update({
      where: { id: feeId },
      data: {
        amountPaid: newAmountPaid,
        status: newStatus,
        paidDate: isFullyPaid ? new Date() : undefined,
        transactionId,
      },
    });

    if (isFullyPaid) {
      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.FINANCE.FEE_PAID,
        aggregateId: feeId,
        aggregateType: 'MemberFee',
        payload: { memberId: fee.orgMemberId, amountPaid: newAmountPaid.toString() },
        actorUserId,
      });
    }

    return updated;
  }

  async findFees(
    orgId: string,
    filters?: {
      orgMemberId?: string;
      status?: string;
      feeType?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.MemberFeeWhereInput = { orgId };
    if (filters?.orgMemberId) where.orgMemberId = filters.orgMemberId;
    if (filters?.status) where.status = filters.status;
    if (filters?.feeType) where.feeType = filters.feeType;

    const [data, total] = await Promise.all([
      this.prisma.memberFee.findMany({
        where,
        include: { orgMember: { select: { scoutName: true, memberCode: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memberFee.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  // ── Reports ──

  async getFinanceSummary(orgId: string, accountId?: string) {
    const where: Prisma.FinancialTransactionWhereInput = { orgId, status: 'completed' };
    if (accountId) where.accountId = accountId;

    const transactions = await this.prisma.financialTransaction.findMany({ where });

    const summary: Record<string, { income: number; expense: number; net: number }> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
      const cat = tx.category ?? 'uncategorized';
      if (!summary[cat]) summary[cat] = { income: 0, expense: 0, net: 0 };

      const amount = Number(tx.amount);
      const entry = summary[cat]!;
      if (tx.transactionType === 'income') {
        entry.income += amount;
        totalIncome += amount;
      } else {
        entry.expense += amount;
        totalExpense += amount;
      }
      entry.net = entry.income - entry.expense;
    }

    return {
      byCategory: summary,
      totals: { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense },
    };
  }

  // T-1064: Balance projections — estimated future balances based on recurring fees and recent spending
  async getBalanceProjections(orgId: string, months = 6) {
    // Current balances per account
    const accounts = await this.prisma.financialAccount.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true, currentBalance: true, currency: true },
    });

    // Outstanding fees (expected income)
    const unpaidFees = await this.prisma.memberFee.findMany({
      where: { orgId, status: { in: ['unpaid', 'partial', 'overdue'] } },
      select: { amountDue: true, amountPaid: true, dueDate: true },
    });

    const expectedIncome = unpaidFees.reduce(
      (sum, f) => sum + Number(f.amountDue) - Number(f.amountPaid),
      0,
    );

    // Monthly spending avg (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentExpenses = await this.prisma.financialTransaction.findMany({
      where: {
        orgId,
        status: 'completed',
        transactionType: 'expense',
        transactionDate: { gte: sixMonthsAgo },
      },
      select: { amount: true, transactionDate: true },
    });

    const monthlyExpenseAvg =
      recentExpenses.length > 0
        ? recentExpenses.reduce((sum, tx) => sum + Number(tx.amount), 0) / 6
        : 0;

    // Project forward
    const totalCurrentBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

    const projections = Array.from({ length: months }, (_, i) => {
      const month = i + 1;
      const projectedIncome = (expectedIncome / months) * month;
      const projectedExpense = monthlyExpenseAvg * month;
      return {
        month,
        label: new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7),
        estimatedBalance: totalCurrentBalance + projectedIncome - projectedExpense,
        projectedIncome,
        projectedExpense,
      };
    });

    return {
      accounts: accounts.map((a) => ({
        ...a,
        currentBalance: Number(a.currentBalance),
      })),
      totalCurrentBalance,
      expectedIncome,
      monthlyExpenseAvg,
      projections,
    };
  }

  // T-1065: Export transactions — returns CSV-ready array for audit/export
  async exportTransactions(
    orgId: string,
    filters?: {
      accountId?: string;
      costCenterId?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const where: Prisma.FinancialTransactionWhereInput = { orgId };
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.costCenterId) where.costCenterId = filters.costCenterId;
    if (filters?.status) where.status = filters.status;
    if (filters?.fromDate || filters?.toDate) {
      where.transactionDate = {};
      if (filters?.fromDate) where.transactionDate.gte = new Date(filters.fromDate);
      if (filters?.toDate) where.transactionDate.lte = new Date(filters.toDate);
    }

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      include: {
        account: { select: { name: true } },
        costCenter: { select: { code: true, name: true } },
      },
      orderBy: { transactionDate: 'asc' },
    });

    return {
      exportedAt: new Date().toISOString(),
      totalRows: transactions.length,
      rows: transactions.map((tx) => ({
        id: tx.id,
        date: tx.transactionDate.toISOString().slice(0, 10),
        account: tx.account.name,
        costCenter: tx.costCenter ? `${tx.costCenter.code} - ${tx.costCenter.name}` : '',
        type: tx.transactionType,
        category: tx.category ?? '',
        amount: Number(tx.amount),
        currency: tx.currency,
        description: tx.description,
        status: tx.status,
        referenceNo: tx.referenceNo ?? '',
        recordedBy: tx.recordedBy,
        approvedBy: tx.approvedBy ?? '',
      })),
    };
  }

  async getMemberFees(orgId: string, memberId: string) {
    const fees = await this.prisma.memberFee.findMany({
      where: { orgId, orgMemberId: memberId },
      include: { installments: { orderBy: { installmentNo: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalDue = fees.reduce((sum, f) => sum + Number(f.amountDue), 0);
    const totalPaid = fees.reduce((sum, f) => sum + Number(f.amountPaid), 0);
    const outstanding = totalDue - totalPaid;

    return { fees, summary: { totalDue, totalPaid, outstanding } };
  }

  // T-1072: Budget variance — compares actual income/expense vs expected (based on fee plans)
  async getBudgetVariance(orgId: string, period?: string) {
    // Expected income from active fee plans
    const activePlans = await this.prisma.feePlan.findMany({
      where: { orgId, isActive: true },
      include: { _count: { select: { fees: true } } },
    });

    const expectedIncome = activePlans.reduce(
      (sum, p) => sum + Number(p.amount) * p._count.fees,
      0,
    );

    // Actual income from completed transactions
    const actual = await this.prisma.financialTransaction.findMany({
      where: { orgId, status: 'completed' },
      select: { transactionType: true, amount: true, category: true },
    });

    const actualIncome = actual
      .filter((t) => t.transactionType === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const actualExpense = actual
      .filter((t) => t.transactionType === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // By category
    const byCategory: Record<
      string,
      { actual: number; budget: number; variance: number; pct: number }
    > = {};
    for (const tx of actual) {
      const cat = tx.category ?? 'uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { actual: 0, budget: 0, variance: 0, pct: 0 };
      byCategory[cat]!.actual += Number(tx.amount);
    }
    // Calculate variance
    for (const cat of Object.keys(byCategory)) {
      const entry = byCategory[cat]!;
      entry.variance = entry.budget - entry.actual;
      entry.pct = entry.budget > 0 ? (entry.actual / entry.budget) * 100 : 0;
    }

    return {
      period: period ?? 'all-time',
      budget: { expectedIncome },
      actual: { income: actualIncome, expense: actualExpense, net: actualIncome - actualExpense },
      variance: {
        income: actualIncome - expectedIncome,
        incomePct: expectedIncome > 0 ? ((actualIncome / expectedIncome) * 100).toFixed(1) : '0',
      },
      byCategory,
      feeCollectionRate:
        expectedIncome > 0 ? ((actualIncome / expectedIncome) * 100).toFixed(1) : '0',
    };
  }

  // T-1078: Reconciliation — checks balance consistency
  async getReconciliationReport(orgId: string) {
    const accounts = await this.prisma.financialAccount.findMany({
      where: { orgId },
      select: { id: true, name: true, currentBalance: true },
    });

    const results = await Promise.all(
      accounts.map(async (acc) => {
        const transactions = await this.prisma.financialTransaction.findMany({
          where: { orgId, accountId: acc.id, status: 'completed' },
          select: { transactionType: true, amount: true },
        });

        const calculatedBalance = transactions.reduce((sum, tx) => {
          const amt = Number(tx.amount);
          return tx.transactionType === 'income' ? sum + amt : sum - amt;
        }, 0);

        const storedBalance = Number(acc.currentBalance);
        const discrepancy = storedBalance - calculatedBalance;

        return {
          accountId: acc.id,
          accountName: acc.name,
          storedBalance,
          calculatedBalance,
          discrepancy,
          isConsistent: Math.abs(discrepancy) < 0.01,
          transactionCount: transactions.length,
        };
      }),
    );

    const inconsistentCount = results.filter((r) => !r.isConsistent).length;

    return {
      reportDate: new Date().toISOString(),
      accounts: results,
      summary: {
        totalAccounts: results.length,
        consistent: results.length - inconsistentCount,
        inconsistent: inconsistentCount,
        overallHealthy: inconsistentCount === 0,
      },
    };
  }

  // ── Fee Plans ──

  async createFeePlan(
    orgId: string,
    data: {
      name: string;
      feeType: string;
      amount: number;
      frequency?: string;
      effectiveDate: string;
      endDate?: string;
      description?: string;
    },
    actorUserId: string,
  ) {
    const plan = await this.prisma.feePlan.create({
      data: {
        orgId,
        name: data.name,
        feeType: data.feeType,
        amount: data.amount,
        frequency: data.frequency ?? 'monthly',
        effectiveDate: new Date(data.effectiveDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        description: data.description,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.fee_plan_created',
      resource: 'FeePlan',
      resourceId: plan.id,
    });

    return plan;
  }

  async getFeePlans(orgId: string, filters?: { isActive?: boolean }, page = 1, limit = 20) {
    const where: Prisma.FeePlanWhereInput = { orgId };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [data, total] = await Promise.all([
      this.prisma.feePlan.findMany({
        where,
        include: { _count: { select: { fees: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feePlan.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async applyFeePlanToMembers(
    orgId: string,
    feePlanId: string,
    memberIds: string[],
    dueDate: string | undefined,
    actorUserId: string,
  ) {
    const plan = await this.prisma.feePlan.findFirst({
      where: { id: feePlanId, orgId, isActive: true },
    });
    if (!plan) throw new NotFoundException('Fee plan not found or inactive');

    const fees = await this.prisma.$transaction(
      memberIds.map((memberId) =>
        this.prisma.memberFee.create({
          data: {
            orgId,
            orgMemberId: memberId,
            feeType: plan.feeType,
            feePeriod: plan.frequency,
            amountDue: plan.amount,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            feePlanId: plan.id,
          },
        }),
      ),
    );

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.fee_plan_applied',
      resource: 'FeePlan',
      resourceId: feePlanId,
      newValue: { memberCount: memberIds.length } as unknown as Prisma.InputJsonValue,
    });

    return { applied: fees.length, feePlanId, fees };
  }

  // ── Installments ──

  async createInstallments(orgId: string, feeId: string, count: number, actorUserId: string) {
    const fee = await this.prisma.memberFee.findFirst({ where: { id: feeId, orgId } });
    if (!fee) throw new NotFoundException('Fee not found');

    const perInstallment = Number(fee.amountDue) / count;
    const baseDate = fee.dueDate ?? new Date();

    const installments = await this.prisma.$transaction(
      Array.from({ length: count }, (_, i) => {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        return this.prisma.feeInstallment.create({
          data: {
            orgId,
            memberFeeId: feeId,
            installmentNo: i + 1,
            amountDue: perInstallment,
            dueDate,
          },
        });
      }),
    );

    return { installments, total: count, amountPerInstallment: perInstallment };
  }

  // ── Waivers / Campership ──

  async requestWaiver(
    orgId: string,
    feeId: string,
    reason: string,
    campershapAmount: number | undefined,
    actorUserId: string,
  ) {
    const fee = await this.prisma.memberFee.findFirst({ where: { id: feeId, orgId } });
    if (!fee) throw new NotFoundException('Fee not found');
    if (fee.status === 'paid' || fee.status === 'waived') {
      throw new BadRequestException(`Cannot request waiver for fee in '${fee.status}' status`);
    }

    const updated = await this.prisma.memberFee.update({
      where: { id: feeId },
      data: {
        waiverReason: reason,
        campershapAmount: campershapAmount ?? undefined,
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.FINANCE.FEE_CREATED, // waiver_requested — reuse event
      aggregateId: feeId,
      aggregateType: 'MemberFee',
      payload: { action: 'waiver_requested', reason, memberId: fee.orgMemberId },
      actorUserId,
    });

    return updated;
  }

  async approveWaiver(orgId: string, feeId: string, actorUserId: string) {
    const fee = await this.prisma.memberFee.findFirst({ where: { id: feeId, orgId } });
    if (!fee) throw new NotFoundException('Fee not found');
    if (!fee.waiverReason) throw new BadRequestException('No waiver request found for this fee');

    const allowed = FEE_TRANSITIONS[fee.status];
    if (!allowed?.waive)
      throw new BadRequestException(`Cannot waive fee in '${fee.status}' status`);

    const updated = await this.prisma.memberFee.update({
      where: { id: feeId },
      data: {
        status: 'waived',
        waiverApprovedBy: actorUserId,
        waiverDate: new Date(),
        amountPaid: fee.campershapAmount ?? fee.amountDue,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.fee_waived',
      resource: 'MemberFee',
      resourceId: feeId,
    });

    return updated;
  }

  // ── Sponsors ──

  async createSponsor(
    orgId: string,
    data: {
      name: string;
      contactEmail?: string;
      contactPhone?: string;
      sponsorType?: string;
      description?: string;
    },
    actorUserId: string,
  ) {
    const sponsor = await this.prisma.sponsor.create({
      data: { orgId, ...data },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.sponsor_created',
      resource: 'Sponsor',
      resourceId: sponsor.id,
    });

    return sponsor;
  }

  async getSponsors(
    orgId: string,
    filters?: { isActive?: boolean; sponsorType?: string },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.SponsorWhereInput = { orgId };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.sponsorType) where.sponsorType = filters.sponsorType;

    const [data, total] = await Promise.all([
      this.prisma.sponsor.findMany({
        where,
        include: { _count: { select: { contributions: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sponsor.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async recordContribution(
    orgId: string,
    sponsorId: string,
    data: {
      contributionType: string;
      amount?: number;
      inKindDescription?: string;
      inKindEstValue?: number;
      transactionId?: string;
      receivedDate: string;
      notes?: string;
    },
    actorUserId: string,
  ) {
    const sponsor = await this.prisma.sponsor.findFirst({ where: { id: sponsorId, orgId } });
    if (!sponsor) throw new NotFoundException('Sponsor not found');

    const contribution = await this.prisma.sponsorContribution.create({
      data: {
        orgId,
        sponsorId,
        contributionType: data.contributionType,
        amount: data.amount,
        inKindDescription: data.inKindDescription,
        inKindEstValue: data.inKindEstValue,
        transactionId: data.transactionId,
        receivedDate: new Date(data.receivedDate),
        notes: data.notes,
      },
    });

    // Update total contributed for cash donations
    if (data.contributionType === 'cash' && data.amount) {
      await this.prisma.sponsor.update({
        where: { id: sponsorId },
        data: { totalContributed: { increment: data.amount } },
      });
    }

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.contribution_recorded',
      resource: 'SponsorContribution',
      resourceId: contribution.id,
    });

    return contribution;
  }
}
