import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';
import { DOMAIN_EVENTS } from '@ttndd/constants';

/**
 * SM-8: Asset Loan Lifecycle
 * pending → approved → checked_out → returned
 *                                  → lost
 */
const LOAN_TRANSITIONS: Record<string, Record<string, string>> = {
  pending: { approve: 'approved', reject: 'rejected' },
  approved: { checkout: 'checked_out' },
  checked_out: { return: 'returned', report_lost: 'lost' },
};

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── Categories ──

  async createCategory(orgId: string, data: {
    name: string; description?: string; ownerType?: string;
    branchId?: string; icon?: string;
  }, actorUserId: string) {
    const category = await this.prisma.assetCategory.create({
      data: { orgId, ...data },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'asset.category_created',
      resource: 'AssetCategory', resourceId: category.id,
    });

    return category;
  }

  async getCategories(orgId: string) {
    return this.prisma.assetCategory.findMany({
      where: { orgId },
      include: { _count: { select: { assets: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ── Assets ──

  async createAsset(orgId: string, data: {
    name: string; categoryId: string; assetCode: string;
    ownerType?: string; branchId?: string; condition?: string;
    quantity?: number; unit?: string; purchaseDate?: string;
    purchasePrice?: number; serialNumber?: string; location?: string;
    photoUrls?: string[]; notes?: string; managedBy?: string;
  }, actorUserId: string) {
    const asset = await this.prisma.asset.create({
      data: {
        orgId,
        assetCode: data.assetCode,
        name: data.name,
        categoryId: data.categoryId,
        ownerType: data.ownerType,
        branchId: data.branchId,
        condition: data.condition,
        quantity: data.quantity ?? 1,
        availableQty: data.quantity ?? 1,
        unit: data.unit,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        purchasePrice: data.purchasePrice,
        serialNumber: data.serialNumber,
        location: data.location,
        photoUrls: data.photoUrls ?? [],
        notes: data.notes,
        managedBy: data.managedBy,
      },
    });

    await this.audit.log({
      orgId, userId: actorUserId, action: 'asset.asset_created',
      resource: 'Asset', resourceId: asset.id,
    });

    return asset;
  }

  async getAssets(orgId: string, filters?: {
    categoryId?: string; status?: string; branchId?: string; condition?: string;
  }, page = 1, limit = 20) {
    const where: Prisma.AssetWhereInput = { orgId };
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.status) where.status = filters.status;
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.condition) where.condition = filters.condition;

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        include: { category: { select: { name: true, icon: true } }, _count: { select: { loans: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async getAssetById(orgId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, orgId },
      include: {
        category: true,
        loans: { orderBy: { requestedAt: 'desc' }, take: 10 },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  // ── QR Code Placeholder ──

  getQrData(orgId: string, assetId: string, assetCode: string) {
    return {
      qrPayload: JSON.stringify({ orgId, assetId, assetCode }),
      message: 'Use this payload with a QR library (e.g. qrcode) to generate the image',
    };
  }

  // ── Loans ──

  async createLoan(orgId: string, data: {
    assetId: string; quantity?: number; borrowerId: string;
    purpose?: string; expectedReturn: string;
  }, actorUserId: string) {
    const asset = await this.getAssetById(orgId, data.assetId);
    const qty = data.quantity ?? 1;
    if (asset.availableQty < qty) {
      throw new BadRequestException(`Insufficient quantity: available=${asset.availableQty}, requested=${qty}`);
    }

    const loan = await this.prisma.assetLoan.create({
      data: {
        orgId,
        assetId: data.assetId,
        quantity: qty,
        borrowerId: data.borrowerId,
        purpose: data.purpose,
        expectedReturn: new Date(data.expectedReturn),
      },
    });

    return loan;
  }

  async transitionLoan(orgId: string, loanId: string, action: string, actorUserId: string, data?: {
    conditionOnReturn?: string; returnNotes?: string;
  }) {
    const loan = await this.prisma.assetLoan.findFirst({ where: { id: loanId, orgId } });
    if (!loan) throw new NotFoundException('Loan not found');

    const allowed = LOAN_TRANSITIONS[loan.status];
    if (!allowed?.[action]) {
      throw new BadRequestException(`Action '${action}' not allowed from '${loan.status}'`);
    }
    const newStatus = allowed[action];

    const updateData: Prisma.AssetLoanUpdateInput = { status: newStatus };

    if (action === 'approve') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = actorUserId;
    }

    if (action === 'checkout') {
      await this.prisma.asset.update({
        where: { id: loan.assetId },
        data: { availableQty: { decrement: loan.quantity } },
      });

      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.ASSET.CHECKED_OUT,
        aggregateId: loan.assetId,
        aggregateType: 'Asset',
        payload: { loanId, borrowerId: loan.borrowerId, quantity: loan.quantity },
        actorUserId,
      });
    }

    if (action === 'return') {
      updateData.actualReturn = new Date();
      if (data?.conditionOnReturn) updateData.conditionOnReturn = data.conditionOnReturn;
      if (data?.returnNotes) updateData.returnNotes = data.returnNotes;

      await this.prisma.asset.update({
        where: { id: loan.assetId },
        data: { availableQty: { increment: loan.quantity } },
      });

      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.ASSET.RETURNED,
        aggregateId: loan.assetId,
        aggregateType: 'Asset',
        payload: { loanId, borrowerId: loan.borrowerId, condition: data?.conditionOnReturn },
        actorUserId,
      });
    }

    if (action === 'report_lost') {
      await this.domainEvents.publish({
        orgId,
        eventType: DOMAIN_EVENTS.ASSET.REPORTED_LOST,
        aggregateId: loan.assetId,
        aggregateType: 'Asset',
        payload: { loanId, borrowerId: loan.borrowerId, quantity: loan.quantity },
        actorUserId,
      });
    }

    return this.prisma.assetLoan.update({ where: { id: loanId }, data: updateData });
  }

  // ── Inventory Summary ──

  async getInventorySummary(orgId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { orgId },
      include: { category: { select: { name: true } } },
    });

    const byCategory: Record<string, { total: number; available: number; onLoan: number }> = {};
    let grandTotal = 0;
    let grandAvailable = 0;

    for (const asset of assets) {
      const cat = asset.category.name;
      if (!byCategory[cat]) byCategory[cat] = { total: 0, available: 0, onLoan: 0 };
      byCategory[cat].total += asset.quantity;
      byCategory[cat].available += asset.availableQty;
      byCategory[cat].onLoan += asset.quantity - asset.availableQty;
      grandTotal += asset.quantity;
      grandAvailable += asset.availableQty;
    }

    return {
      byCategory,
      totals: { total: grandTotal, available: grandAvailable, onLoan: grandTotal - grandAvailable },
      assetCount: assets.length,
    };
  }
}
