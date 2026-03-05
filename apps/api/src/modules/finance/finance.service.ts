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

  // ── Accounts ──

  async createAccount(orgId: string, data: {
    name: string; accountType?: string; branchId?: string;
    currency?: string; description?: string;
  }, actorUserId: string) {
    const account = await this.prisma.financialAccount.create({
      data: { orgId, ...data },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'finance.account_created',
      resource: 'FinancialAccount', resourceId: account.id,
    });

    return account;
  }

  async getAccounts(orgId: string, filters?: { accountType?: string; isActive?: boolean }, page = 1, limit = 20) {
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

  async createTransaction(orgId: string, data: {
    accountId: string; transactionType: string; category?: string;
    amount: number; description: string; sourceType?: string;
    sourceId?: string; referenceNo?: string; transactionDate: string;
    receiptUrls?: string[];
  }, actorUserId: string) {
    const account = await this.getAccountById(orgId, data.accountId);
    if (!account.isActive) {
      throw new BadRequestException('Cannot create transaction on inactive account');
    }

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
      orgId, userId: actorUserId, action: 'finance.transaction_created',
      resource: 'FinancialTransaction', resourceId: transaction.id,
      newValue: { amount: data.amount, type: data.transactionType } as unknown as Prisma.InputJsonValue,
    });

    return transaction;
  }

  async transitionTransaction(orgId: string, transactionId: string, action: string, actorUserId: string) {
    const tx = await this.prisma.financialTransaction.findFirst({ where: { id: transactionId, orgId } });
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
      const delta = tx.transactionType === 'income'
        ? tx.amount
        : tx.amount.negated();

      await this.prisma.financialAccount.update({
        where: { id: tx.accountId },
        data: { currentBalance: { increment: delta } },
      });

      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.FINANCE.TRANSACTION_COMPLETED,
        aggregateId: transactionId,
        aggregateType: 'FinancialTransaction',
        payload: { amount: tx.amount.toString(), type: tx.transactionType, accountId: tx.accountId },
        actorUserId,
      });
    }

    if (newStatus === 'reversed' && tx.status === 'completed') {
      const reverseDelta = tx.transactionType === 'income'
        ? tx.amount.negated()
        : tx.amount;

      await this.prisma.financialAccount.update({
        where: { id: tx.accountId },
        data: { currentBalance: { increment: reverseDelta } },
      });
    }

    return updated;
  }

  // ── Fees ──

  async createFee(orgId: string, data: {
    orgMemberId: string; feeType?: string; feePeriod?: string;
    amountDue: number; dueDate?: string; notes?: string;
  }, actorUserId: string) {
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

  async payFee(orgId: string, feeId: string, paymentAmount: number, transactionId: string | undefined, actorUserId: string) {
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

  async findFees(orgId: string, filters?: {
    orgMemberId?: string; status?: string; feeType?: string;
  }, page = 1, limit = 20) {
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
    const outstanding = totalDue - totalPaid;

    return { fees, summary: { totalDue, totalPaid, outstanding } };
  }
}
