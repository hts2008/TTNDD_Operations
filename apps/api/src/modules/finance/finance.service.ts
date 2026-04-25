import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

/** SM-6: Transaction Lifecycle */
const TRANSACTION_TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { approve: 'approved', reject: 'rejected' },
  approved: { complete: 'completed', reverse: 'reversed' },
  completed: { reverse: 'reversed' },
};

/** SM-7: Fee Payment Lifecycle */
const FEE_TRANSITIONS: Record<string, Record<string, string>> = {
  unpaid: { pay_partial: 'partial', pay_full: 'paid', waive: 'waived', mark_overdue: 'overdue' },
  partial: { pay_full: 'paid', waive: 'waived', mark_overdue: 'overdue' },
  overdue: { pay_partial: 'partial', pay_full: 'paid', waive: 'waived' },
};

/** T-1061: Cost center storage (JSON-based, no schema migration) */
export interface CostCenter {
  id: string;
  name: string;
  code?: string;
  parentId?: string;
  budgetAmount: number;
  spentAmount: number;
  description?: string;
  createdAt: string;
}

/** T-1066: Fee plan template */
export interface FeePlan {
  id: string;
  name: string;
  frequency: string;
  amount: number;
  feeType?: string;
  description?: string;
  startDate?: string;
  isActive: boolean;
  createdAt: string;
}

/** T-1069: Sponsor record */
export interface SponsorRecord {
  id: string;
  name: string;
  contributionType: string;
  amount: number;
  description?: string;
  receivedDate?: string;
  contactInfo?: string;
  createdAt: string;
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

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
    const account = await this.prisma.financialAccount.create({ data: { orgId, ...data } });
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

  // ── T-1061: Cost Centers ──

  async createCostCenter(
    orgId: string,
    data: {
      name: string;
      code?: string;
      parentId?: string;
      budgetAmount: number;
      description?: string;
    },
    actorUserId: string,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const existing = ((org.settings as Record<string, unknown>)?.costCenters ?? []) as CostCenter[];
    const cc: CostCenter = {
      id: `cc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name,
      code: data.code,
      parentId: data.parentId,
      budgetAmount: data.budgetAmount,
      spentAmount: 0,
      description: data.description,
      createdAt: new Date().toISOString(),
    };
    existing.push(cc);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...((org.settings as Record<string, unknown>) ?? {}),
          costCenters: existing,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.cost_center_created',
      resource: 'CostCenter',
      resourceId: cc.id,
    });
    return cc;
  }

  async getCostCenters(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    return ((org?.settings as Record<string, unknown>)?.costCenters ?? []) as CostCenter[];
  }

  // ── Transactions ──

  async createTransaction(
    orgId: string,
    data: {
      accountId: string;
      transactionType: string;
      category?: string;
      costCenterId?: string;
      amount: number;
      description: string;
      sourceType?: string;
      sourceId?: string;
      referenceNo?: string;
      transactionDate: string;
      receiptUrls?: string[];
    },
    actorUserId: string,
  ) {
    const account = await this.getAccountById(orgId, data.accountId);
    if (!account.isActive)
      throw new BadRequestException('Cannot create transaction on inactive account');

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        orgId,
        accountId: data.accountId,
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
    if (!allowed?.[action])
      throw new BadRequestException(`Action '${action}' not allowed from '${tx.status}'`);
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

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: `finance.transaction_${action}`,
      resource: 'FinancialTransaction',
      resourceId: transactionId,
      oldValue: { status: tx.status } as unknown as Prisma.InputJsonValue,
      newValue: { status: newStatus } as unknown as Prisma.InputJsonValue,
    });
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

    if (!allowed[action])
      throw new BadRequestException(`Payment action '${action}' not allowed from '${fee.status}'`);
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

  // ── T-1068: Waiver Flow ──

  async waiveFee(orgId: string, feeId: string, reason: string, actorUserId: string) {
    const fee = await this.prisma.memberFee.findFirst({ where: { id: feeId, orgId } });
    if (!fee) throw new NotFoundException('Fee not found');

    const allowed = FEE_TRANSITIONS[fee.status];
    if (!allowed?.waive)
      throw new BadRequestException(`Cannot waive fee in '${fee.status}' status`);

    const updated = await this.prisma.memberFee.update({
      where: { id: feeId },
      data: {
        status: 'waived',
        notes: `[WAIVED] ${reason}${fee.notes ? ` | Original: ${fee.notes}` : ''}`,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.fee_waived',
      resource: 'MemberFee',
      resourceId: feeId,
      newValue: { reason, previousStatus: fee.status } as unknown as Prisma.InputJsonValue,
    });
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

  // ── T-1066: Fee Plans ──

  async createFeePlan(
    orgId: string,
    data: {
      name: string;
      frequency: string;
      amount: number;
      feeType?: string;
      description?: string;
      startDate?: string;
    },
    actorUserId: string,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const existing = ((org.settings as Record<string, unknown>)?.feePlans ?? []) as FeePlan[];
    const plan: FeePlan = {
      id: `fp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name,
      frequency: data.frequency,
      amount: data.amount,
      feeType: data.feeType,
      description: data.description,
      startDate: data.startDate,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    existing.push(plan);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...((org.settings as Record<string, unknown>) ?? {}),
          feePlans: existing,
        } as unknown as Prisma.InputJsonValue,
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

  async getFeePlans(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    return ((org?.settings as Record<string, unknown>)?.feePlans ?? []) as FeePlan[];
  }

  // ── T-1069: Sponsors ──

  async createSponsor(
    orgId: string,
    data: {
      name: string;
      contributionType: string;
      amount: number;
      description?: string;
      receivedDate?: string;
      contactInfo?: string;
    },
    actorUserId: string,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    const existing = ((org.settings as Record<string, unknown>)?.sponsors ?? []) as SponsorRecord[];
    const sponsor: SponsorRecord = {
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: data.name,
      contributionType: data.contributionType,
      amount: data.amount,
      description: data.description,
      receivedDate: data.receivedDate,
      contactInfo: data.contactInfo,
      createdAt: new Date().toISOString(),
    };
    existing.push(sponsor);

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...((org.settings as Record<string, unknown>) ?? {}),
          sponsors: existing,
        } as unknown as Prisma.InputJsonValue,
      },
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

  async getSponsors(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    return ((org?.settings as Record<string, unknown>)?.sponsors ?? []) as SponsorRecord[];
  }

  async getSponsorSummary(orgId: string) {
    const sponsors = await this.getSponsors(orgId);
    const cashTotal = sponsors
      .filter((s) => s.contributionType === 'cash')
      .reduce((sum, s) => sum + s.amount, 0);
    const inKindTotal = sponsors
      .filter((s) => s.contributionType === 'in_kind')
      .reduce((sum, s) => sum + s.amount, 0);
    return {
      sponsors,
      summary: {
        cashTotal,
        inKindTotal,
        grandTotal: cashTotal + inKindTotal,
        count: sponsors.length,
      },
    };
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
      if (tx.transactionType === 'income') {
        summary[cat].income += amount;
        totalIncome += amount;
      } else {
        summary[cat].expense += amount;
        totalExpense += amount;
      }
      summary[cat].net = summary[cat].income - summary[cat].expense;
    }

    return {
      byCategory: summary,
      totals: { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense },
    };
  }

  async getMemberFees(orgId: string, memberId: string) {
    const fees = await this.prisma.memberFee.findMany({
      where: { orgId, orgMemberId: memberId },
      orderBy: { createdAt: 'desc' },
    });
    const totalDue = fees.reduce((sum, f) => sum + Number(f.amountDue), 0);
    const totalPaid = fees.reduce((sum, f) => sum + Number(f.amountPaid), 0);
    return { fees, summary: { totalDue, totalPaid, outstanding: totalDue - totalPaid } };
  }

  // ── T-1064: Balance Projections ──

  async getBalanceProjections(orgId: string, daysAhead = 90) {
    const accounts = await this.prisma.financialAccount.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true, currentBalance: true },
    });
    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

    const pendingIncome = await this.prisma.financialTransaction.aggregate({
      where: { orgId, transactionType: 'income', status: { in: ['pending', 'approved'] } },
      _sum: { amount: true },
    });
    const pendingExpense = await this.prisma.financialTransaction.aggregate({
      where: { orgId, transactionType: 'expense', status: { in: ['pending', 'approved'] } },
      _sum: { amount: true },
    });

    const unpaidFees = await this.prisma.memberFee.aggregate({
      where: { orgId, status: { in: ['unpaid', 'partial', 'overdue'] } },
      _sum: { amountDue: true, amountPaid: true },
    });
    const expectedFeeIncome =
      Number(unpaidFees._sum.amountDue ?? 0) - Number(unpaidFees._sum.amountPaid ?? 0);

    return {
      currentBalance: totalBalance,
      pendingIncome: Number(pendingIncome._sum.amount ?? 0),
      pendingExpense: Number(pendingExpense._sum.amount ?? 0),
      expectedFeeIncome,
      projectedBalance:
        totalBalance +
        Number(pendingIncome._sum.amount ?? 0) -
        Number(pendingExpense._sum.amount ?? 0) +
        expectedFeeIncome,
      projectionDays: daysAhead,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        balance: Number(a.currentBalance),
      })),
    };
  }

  // ── T-1072: Budget Variance ──

  async getBudgetVariance(orgId: string) {
    const costCenters = await this.getCostCenters(orgId);
    const transactions = await this.prisma.financialTransaction.findMany({
      where: { orgId, transactionType: 'expense', status: 'completed' },
      select: { category: true, amount: true },
    });

    const spentByCategory: Record<string, number> = {};
    for (const tx of transactions) {
      const cat = tx.category ?? 'uncategorized';
      spentByCategory[cat] = (spentByCategory[cat] ?? 0) + Number(tx.amount);
    }

    const variance = costCenters.map((cc) => {
      const spent = spentByCategory[cc.name] ?? 0;
      return {
        costCenter: cc.name,
        code: cc.code,
        budgeted: cc.budgetAmount,
        spent,
        remaining: cc.budgetAmount - spent,
        variancePercent: cc.budgetAmount > 0 ? Math.round((spent / cc.budgetAmount) * 100) : 0,
        status:
          spent > cc.budgetAmount
            ? 'over_budget'
            : spent > cc.budgetAmount * 0.9
              ? 'warning'
              : 'on_track',
      };
    });

    const totalBudgeted = costCenters.reduce((s, c) => s + c.budgetAmount, 0);
    const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);

    return {
      variance,
      totals: { budgeted: totalBudgeted, spent: totalSpent, remaining: totalBudgeted - totalSpent },
    };
  }

  // ── T-1070: Parent Payment Visibility ──

  async getParentFeeView(orgId: string, memberId: string) {
    const fees = await this.prisma.memberFee.findMany({
      where: { orgId, orgMemberId: memberId },
      select: {
        id: true,
        feeType: true,
        feePeriod: true,
        amountDue: true,
        amountPaid: true,
        status: true,
        dueDate: true,
        paidDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const totalDue = fees.reduce((s, f) => s + Number(f.amountDue), 0);
    const totalPaid = fees.reduce((s, f) => s + Number(f.amountPaid), 0);
    return { fees, summary: { totalDue, totalPaid, outstanding: totalDue - totalPaid }, memberId };
  }

  // ── T-1065/T-1074: Export ──

  async exportTransactions(
    orgId: string,
    filters?: { accountId?: string; fromDate?: string; toDate?: string },
  ) {
    const where: Prisma.FinancialTransactionWhereInput = { orgId };
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.fromDate || filters?.toDate) {
      where.transactionDate = {};
      if (filters?.fromDate) where.transactionDate.gte = new Date(filters.fromDate);
      if (filters?.toDate) where.transactionDate.lte = new Date(filters.toDate);
    }

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        transactionType: true,
        category: true,
        amount: true,
        description: true,
        status: true,
        transactionDate: true,
        referenceNo: true,
      },
    });

    return {
      data: transactions.map((tx) => ({
        date: tx.transactionDate.toISOString().split('T')[0],
        type: tx.transactionType,
        category: tx.category ?? '',
        amount: Number(tx.amount),
        description: tx.description,
        status: tx.status,
        reference: tx.referenceNo ?? '',
      })),
      meta: { total: transactions.length, exportedAt: new Date().toISOString() },
    };
  }

  // ── T-1078: Reconciliation ──

  async reconcileBalances(orgId: string) {
    const accounts = await this.prisma.financialAccount.findMany({
      where: { orgId, isActive: true },
    });
    const results = [];

    for (const account of accounts) {
      const completedTx = await this.prisma.financialTransaction.findMany({
        where: { accountId: account.id, status: 'completed' },
      });
      let calculatedBalance = 0;
      for (const tx of completedTx) {
        calculatedBalance +=
          tx.transactionType === 'income' ? Number(tx.amount) : -Number(tx.amount);
      }
      const storedBalance = Number(account.currentBalance);
      const diff = Math.abs(calculatedBalance - storedBalance);

      results.push({
        accountId: account.id,
        accountName: account.name,
        storedBalance,
        calculatedBalance,
        difference: diff,
        isReconciled: diff < 0.01,
      });
    }

    return { accounts: results, allReconciled: results.every((r) => r.isReconciled) };
  }
}
