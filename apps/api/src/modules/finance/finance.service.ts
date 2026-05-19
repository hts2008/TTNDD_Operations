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

  private isDoubleEntryEnabled() {
    return process.env.FINANCE_DOUBLE_ENTRY === 'true';
  }

  private toNumber(value: unknown): number {
    return Number(value ?? 0);
  }

  private toIso(value: unknown): string | undefined {
    return value instanceof Date
      ? value.toISOString()
      : typeof value === 'string'
        ? value
        : undefined;
  }

  private mapCostCenter(row: Record<string, unknown>): CostCenter {
    return {
      id: row.id as string,
      name: row.name as string,
      code: row.code as string | undefined,
      parentId: row.parentId as string | undefined,
      budgetAmount: this.toNumber(row.budgetAmount),
      spentAmount: this.toNumber(row.spentAmount),
      description: row.description as string | undefined,
      createdAt: this.toIso(row.createdAt) ?? new Date().toISOString(),
    };
  }

  private mapFeePlan(row: Record<string, unknown>): FeePlan {
    return {
      id: row.id as string,
      name: row.name as string,
      frequency: row.frequency as string,
      amount: this.toNumber(row.amount),
      feeType: row.feeType as string | undefined,
      description: row.description as string | undefined,
      startDate: this.toIso(row.startDate)?.split('T')[0] ?? (row.startDate as string | undefined),
      isActive: row.isActive as boolean,
      createdAt: this.toIso(row.createdAt) ?? new Date().toISOString(),
    };
  }

  private mapSponsor(row: Record<string, unknown>): SponsorRecord {
    return {
      id: row.id as string,
      name: row.name as string,
      contributionType: row.contributionType as string,
      amount: this.toNumber(row.amount),
      description: row.description as string | undefined,
      receivedDate:
        this.toIso(row.receivedDate)?.split('T')[0] ?? (row.receivedDate as string | undefined),
      contactInfo: row.contactInfo as string | undefined,
      createdAt: this.toIso(row.createdAt) ?? new Date().toISOString(),
    };
  }

  private async assertCostCenter(orgId: string, costCenterId?: string) {
    if (!costCenterId) return;
    const costCenter = await this.prisma.costCenter.findFirst({
      where: { id: costCenterId, orgId },
      select: { id: true },
    });
    if (!costCenter) throw new NotFoundException('Cost center not found');
  }

  private async postLedgerEntries(
    tx: {
      id: string;
      orgId: string;
      accountId: string;
      costCenterId?: string | null;
      transactionType: string;
      amount: Prisma.Decimal | number | string;
      currency?: string;
      description?: string;
      sourceType?: string | null;
      sourceId?: string | null;
    },
    postingAction: 'complete' | 'reverse',
    actorUserId: string,
  ) {
    if (!this.isDoubleEntryEnabled()) return;

    const amount = new Prisma.Decimal(tx.amount);
    const isIncome = tx.transactionType === 'income';
    const isReverse = postingAction === 'reverse';
    const cashEntryType = isIncome ? 'debit' : 'credit';
    const offsetEntryType = isIncome ? 'credit' : 'debit';
    const entries = [
      {
        orgId: tx.orgId,
        transactionId: tx.id,
        accountId: tx.accountId,
        costCenterId: tx.costCenterId ?? undefined,
        postingKey: `${tx.id}:${postingAction}`,
        entryType: isReverse ? offsetEntryType : cashEntryType,
        ledgerAccount: 'cash',
        amount,
        currency: tx.currency ?? 'VND',
        description: tx.description,
        sourceType: tx.sourceType ?? 'financial_transaction',
        sourceId: tx.sourceId ?? undefined,
        createdBy: actorUserId,
      },
      {
        orgId: tx.orgId,
        transactionId: tx.id,
        accountId: undefined,
        costCenterId: tx.costCenterId ?? undefined,
        postingKey: `${tx.id}:${postingAction}`,
        entryType: isReverse ? cashEntryType : offsetEntryType,
        ledgerAccount: isIncome ? 'income' : 'expense',
        amount,
        currency: tx.currency ?? 'VND',
        description: tx.description,
        sourceType: tx.sourceType ?? 'financial_transaction',
        sourceId: tx.sourceId ?? undefined,
        createdBy: actorUserId,
      },
    ];

    await this.prisma.ledgerEntry.createMany({ data: entries, skipDuplicates: true });
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
    if (data.parentId) {
      await this.assertCostCenter(orgId, data.parentId);
    }

    const cc = await this.prisma.costCenter.create({
      data: {
        orgId,
        name: data.name,
        code: data.code,
        parentId: data.parentId,
        budgetAmount: data.budgetAmount,
        description: data.description,
      },
    });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.cost_center_created',
      resource: 'CostCenter',
      newValue: { id: cc.id, code: cc.code } as unknown as Prisma.InputJsonValue,
    });
    return this.mapCostCenter(cc as unknown as Record<string, unknown>);
  }

  async getCostCenters(orgId: string) {
    const costCenters = await this.prisma.costCenter.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    return costCenters.map((cc) => this.mapCostCenter(cc as unknown as Record<string, unknown>));
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
    await this.assertCostCenter(orgId, data.costCenterId);

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        orgId,
        accountId: data.accountId,
        transactionType: data.transactionType,
        category: data.category,
        costCenterId: data.costCenterId,
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
      if (tx.transactionType === 'expense' && tx.costCenterId) {
        await this.prisma.costCenter.update({
          where: { id: tx.costCenterId },
          data: { spentAmount: { increment: tx.amount } },
        });
      }
      await this.postLedgerEntries(tx, 'complete', actorUserId);

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
      if (tx.transactionType === 'expense' && tx.costCenterId) {
        await this.prisma.costCenter.update({
          where: { id: tx.costCenterId },
          data: { spentAmount: { decrement: tx.amount } },
        });
      }
      await this.postLedgerEntries(tx, 'reverse', actorUserId);
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

  async markFeeOverdue(orgId: string, feeId: string, actorUserId: string) {
    const fee = await this.prisma.memberFee.findFirst({ where: { id: feeId, orgId } });
    if (!fee) throw new NotFoundException('Fee not found');

    const allowed = FEE_TRANSITIONS[fee.status];
    if (!allowed?.mark_overdue) {
      throw new BadRequestException(`Cannot mark fee overdue from '${fee.status}' status`);
    }

    const updated = await this.prisma.memberFee.update({
      where: { id: feeId },
      data: { status: 'overdue' },
    });

    const outstanding = Number(fee.amountDue) - Number(fee.amountPaid);
    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.FINANCE.FEE_OVERDUE,
      aggregateId: fee.orgMemberId,
      aggregateType: 'OrgMember',
      payload: {
        feeId,
        memberId: fee.orgMemberId,
        feeType: fee.feeType,
        amountDue: fee.amountDue.toString(),
        amountPaid: fee.amountPaid.toString(),
        outstanding,
      },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.fee_marked_overdue',
      resource: 'MemberFee',
      resourceId: feeId,
      oldValue: { status: fee.status } as unknown as Prisma.InputJsonValue,
      newValue: { status: 'overdue', outstanding } as unknown as Prisma.InputJsonValue,
    });

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
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const where: Prisma.MemberFeeWhereInput = { orgId };
    if (filters?.orgMemberId) where.orgMemberId = filters.orgMemberId;
    if (filters?.status) where.status = filters.status;
    if (filters?.feeType) where.feeType = filters.feeType;
    const [data, total] = await Promise.all([
      this.prisma.memberFee.findMany({
        where,
        include: { orgMember: { select: { scoutName: true, memberCode: true } } },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memberFee.count({ where }),
    ]);
    return { data, meta: { total, page: safePage, limit: safeLimit } };
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
    const plan = await this.prisma.feePlan.create({
      data: {
        orgId,
        name: data.name,
        frequency: data.frequency,
        amount: data.amount,
        feeType: data.feeType,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
      },
    });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.fee_plan_created',
      resource: 'FeePlan',
      newValue: { id: plan.id, frequency: plan.frequency } as unknown as Prisma.InputJsonValue,
    });
    return this.mapFeePlan(plan as unknown as Record<string, unknown>);
  }

  async getFeePlans(orgId: string) {
    const plans = await this.prisma.feePlan.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    return plans.map((plan) => this.mapFeePlan(plan as unknown as Record<string, unknown>));
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
    const sponsor = await this.prisma.sponsor.create({
      data: {
        orgId,
        name: data.name,
        contributionType: data.contributionType,
        amount: data.amount,
        description: data.description,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : undefined,
        contactInfo: data.contactInfo,
      },
    });
    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'finance.sponsor_created',
      resource: 'Sponsor',
      newValue: {
        id: sponsor.id,
        contributionType: sponsor.contributionType,
      } as unknown as Prisma.InputJsonValue,
    });
    return this.mapSponsor(sponsor as unknown as Record<string, unknown>);
  }

  async getSponsors(orgId: string) {
    const sponsors = await this.prisma.sponsor.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    return sponsors.map((sponsor) =>
      this.mapSponsor(sponsor as unknown as Record<string, unknown>),
    );
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
      select: { costCenterId: true, category: true, amount: true },
    });

    const spentByCostCenter: Record<string, number> = {};
    const spentByCategory: Record<string, number> = {};
    for (const tx of transactions) {
      const cat = tx.category ?? 'uncategorized';
      spentByCategory[cat] = (spentByCategory[cat] ?? 0) + Number(tx.amount);
      if (tx.costCenterId) {
        spentByCostCenter[tx.costCenterId] =
          (spentByCostCenter[tx.costCenterId] ?? 0) + Number(tx.amount);
      }
    }

    const variance = costCenters.map((cc) => {
      const spent =
        this.toNumber(cc.spentAmount) || spentByCostCenter[cc.id] || spentByCategory[cc.name] || 0;
      return {
        costCenterId: cc.id,
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

  async getLedgerEntries(
    orgId: string,
    filters?: { transactionId?: string; accountId?: string; costCenterId?: string },
  ) {
    const where: Prisma.LedgerEntryWhereInput = { orgId };
    if (filters?.transactionId) where.transactionId = filters.transactionId;
    if (filters?.accountId) where.accountId = filters.accountId;
    if (filters?.costCenterId) where.costCenterId = filters.costCenterId;

    const entries = await this.prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const totals = entries.reduce(
      (acc, entry) => {
        const amount = Number(entry.amount);
        if (entry.entryType === 'debit') acc.debit += amount;
        if (entry.entryType === 'credit') acc.credit += amount;
        return acc;
      },
      { debit: 0, credit: 0 },
    );

    return {
      data: entries.map((entry) => ({
        ...entry,
        amount: Number(entry.amount),
      })),
      meta: {
        total: entries.length,
        totals: { ...totals, balanced: Math.abs(totals.debit - totals.credit) < 0.01 },
      },
    };
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
      const ledgerEntries = await this.prisma.ledgerEntry.findMany({
        where: { orgId, accountId: account.id },
        select: { entryType: true, amount: true },
      });
      const ledgerBalance = ledgerEntries.reduce((sum, entry) => {
        const amount = Number(entry.amount);
        return entry.entryType === 'debit' ? sum + amount : sum - amount;
      }, 0);
      const storedBalance = Number(account.currentBalance);
      const diff = Math.abs(calculatedBalance - storedBalance);
      const ledgerDiff = ledgerEntries.length > 0 ? Math.abs(ledgerBalance - storedBalance) : null;

      results.push({
        accountId: account.id,
        accountName: account.name,
        storedBalance,
        calculatedBalance,
        ledgerBalance: ledgerEntries.length > 0 ? ledgerBalance : null,
        difference: diff,
        ledgerDifference: ledgerDiff,
        isReconciled: diff < 0.01,
        isLedgerReconciled: ledgerDiff === null ? null : ledgerDiff < 0.01,
      });
    }

    return {
      accounts: results,
      allReconciled: results.every((r) => r.isReconciled),
      allLedgerReconciled: results.every((r) => r.isLedgerReconciled !== false),
    };
  }
}
