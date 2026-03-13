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

  async createCategory(
    orgId: string,
    data: {
      name: string;
      description?: string;
      ownerType?: string;
      branchId?: string;
      icon?: string;
    },
    actorUserId: string,
  ) {
    const category = await this.prisma.assetCategory.create({
      data: { orgId, ...data },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'asset.category_created',
      resource: 'AssetCategory',
      resourceId: category.id,
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

  async createAsset(
    orgId: string,
    data: {
      name: string;
      categoryId: string;
      assetCode: string;
      ownerType?: string;
      branchId?: string;
      condition?: string;
      quantity?: number;
      unit?: string;
      purchaseDate?: string;
      purchasePrice?: number;
      serialNumber?: string;
      location?: string;
      photoUrls?: string[];
      notes?: string;
      managedBy?: string;
    },
    actorUserId: string,
  ) {
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
      orgId,
      userId: actorUserId,
      action: 'asset.asset_created',
      resource: 'Asset',
      resourceId: asset.id,
    });

    return asset;
  }

  // T-1085: Update asset
  async updateAsset(
    orgId: string,
    assetId: string,
    data: {
      name?: string;
      categoryId?: string;
      condition?: string;
      quantity?: number;
      unit?: string;
      location?: string;
      serialNumber?: string;
      notes?: string;
      status?: string;
      managedBy?: string;
    },
    actorUserId: string,
  ) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, orgId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.quantity !== undefined && {
          quantity: data.quantity,
          availableQty: data.quantity,
        }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.managedBy !== undefined && { managedBy: data.managedBy }),
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'asset.asset_updated',
      resource: 'Asset',
      resourceId: assetId,
      newValue: data as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  // T-1085: Retire/soft-delete asset
  async retireAsset(orgId: string, assetId: string, actorUserId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, orgId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: { status: 'retired' },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'asset.asset_retired',
      resource: 'Asset',
      resourceId: assetId,
    });

    return updated;
  }

  // T-1090: Dispose asset (donated/scrapped)
  async disposeAsset(
    orgId: string,
    assetId: string,
    data: { reason: string; notes?: string },
    actorUserId: string,
  ) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, orgId } });
    if (!asset) throw new NotFoundException('Asset not found');

    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: { status: 'disposed', notes: `[${data.reason}] ${data.notes ?? ''}`.trim() },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: DOMAIN_EVENTS.ASSET.REPORTED_LOST,
      aggregateId: assetId,
      aggregateType: 'Asset',
      payload: { reason: data.reason, notes: data.notes },
      actorUserId,
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'asset.asset_disposed',
      resource: 'Asset',
      resourceId: assetId,
      newValue: data as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async getAssets(
    orgId: string,
    filters?: {
      categoryId?: string;
      status?: string;
      branchId?: string;
      condition?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.AssetWhereInput = { orgId };
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.status) where.status = filters.status;
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.condition) where.condition = filters.condition;

    const [data, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        include: {
          category: { select: { name: true, icon: true } },
          _count: { select: { loans: true } },
        },
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

  // T-1085: Get assets by location
  async getAssetsByLocation(orgId: string, location: string) {
    return this.prisma.asset.findMany({
      where: { orgId, location: { contains: location, mode: 'insensitive' } },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ── Loans ──

  async createLoan(
    orgId: string,
    data: {
      assetId: string;
      quantity?: number;
      borrowerId: string;
      purpose?: string;
      expectedReturn: string;
      isBorrowerMinor?: boolean;
    },
    actorUserId: string,
  ) {
    const asset = await this.getAssetById(orgId, data.assetId);
    const qty = data.quantity ?? 1;
    if (asset.availableQty < qty) {
      throw new BadRequestException(
        `Insufficient quantity: available=${asset.availableQty}, requested=${qty}`,
      );
    }

    const loan = await this.prisma.assetLoan.create({
      data: {
        orgId,
        assetId: data.assetId,
        quantity: qty,
        borrowerId: data.borrowerId,
        purpose: data.purpose,
        expectedReturn: new Date(data.expectedReturn),
        // T-1087: if borrower is minor, set guardian acceptance to pending
        guardianAcceptanceStatus: data.isBorrowerMinor ? 'pending' : 'not_required',
      },
    });

    return loan;
  }

  // T-1087: Guardian acceptance for minor borrowers
  async guardianAcceptLoan(
    orgId: string,
    loanId: string,
    decision: string,
    guardianUserId: string,
    notes?: string,
  ) {
    const loan = await this.prisma.assetLoan.findFirst({ where: { id: loanId, orgId } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.guardianAcceptanceStatus !== 'pending') {
      throw new BadRequestException(
        `Guardian acceptance is '${loan.guardianAcceptanceStatus}', not 'pending'`,
      );
    }

    const newStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const updated = await this.prisma.assetLoan.update({
      where: { id: loanId },
      data: {
        guardianAcceptanceStatus: newStatus,
        guardianAcceptedBy: guardianUserId,
        guardianAcceptedAt: new Date(),
        ...(decision === 'reject' ? { returnNotes: notes, status: 'rejected' } : {}),
      },
    });

    await this.domainEvents.publish({
      orgId,
      eventType: decision === 'accept' ? 'asset.guardian_accepted' : 'asset.guardian_rejected',
      aggregateId: loan.assetId,
      aggregateType: 'Asset',
      payload: { loanId, guardianUserId, decision },
      actorUserId: guardianUserId,
    });

    return updated;
  }

  // T-1088: Get overdue loans
  async getOverdueLoans(orgId: string) {
    const now = new Date();
    return this.prisma.assetLoan.findMany({
      where: {
        orgId,
        status: 'checked_out',
        expectedReturn: { lt: now },
      },
      include: {
        asset: { select: { id: true, name: true, assetCode: true } },
      },
      orderBy: { expectedReturn: 'asc' },
    });
  }

  // Get all loans with optional filters
  async getLoans(
    orgId: string,
    filters?: { status?: string; assetId?: string },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.AssetLoanWhereInput = { orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.assetId) where.assetId = filters.assetId;

    const [data, total] = await Promise.all([
      this.prisma.assetLoan.findMany({
        where,
        include: {
          asset: {
            select: { id: true, name: true, assetCode: true, category: { select: { name: true } } },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { requestedAt: 'desc' },
      }),
      this.prisma.assetLoan.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async transitionLoan(
    orgId: string,
    loanId: string,
    action: string,
    actorUserId: string,
    data?: {
      conditionOnReturn?: string;
      returnNotes?: string;
    },
  ) {
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
      updateData.checkedOutAt = new Date();

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
      const entry = byCategory[cat]!;
      entry.total += asset.quantity;
      entry.available += asset.availableQty;
      entry.onLoan += asset.quantity - asset.availableQty;
      grandTotal += asset.quantity;
      grandAvailable += asset.availableQty;
    }

    return {
      byCategory,
      totals: { total: grandTotal, available: grandAvailable, onLoan: grandTotal - grandAvailable },
      assetCount: assets.length,
    };
  }

  // ── QR Code Generation ──

  async generateQrDataUrl(orgId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, orgId } });
    if (!asset) throw new NotFoundException('Asset not found');

    // Generate QR as data URL using dynamic import
    const QRCode = await import('qrcode');
    const qrPayload = JSON.stringify({
      type: 'TTNDD_ASSET',
      id: asset.id,
      code: asset.assetCode,
      name: asset.name,
      org: orgId,
    });

    const dataUrl = await QRCode.toDataURL(qrPayload, { width: 300, margin: 2 });
    return { assetId, assetCode: asset.assetCode, name: asset.name, qrDataUrl: dataUrl };
  }

  // ── Bulk Export ──

  async exportAssets(orgId: string) {
    const assets = await this.prisma.asset.findMany({
      where: { orgId },
      include: { category: { select: { name: true } }, customFields: true },
    });

    return assets.map((a) => ({
      assetCode: a.assetCode,
      name: a.name,
      category: a.category.name,
      status: a.status,
      condition: a.condition,
      quantity: a.quantity,
      availableQty: a.availableQty,
      unit: a.unit,
      location: a.location,
      serialNumber: a.serialNumber,
      purchaseDate: a.purchaseDate,
      purchasePrice: a.purchasePrice ? Number(a.purchasePrice) : null,
      notes: a.notes,
      customFields: a.customFields.reduce(
        (acc, cf) => ({ ...acc, [cf.fieldName]: cf.fieldValue }),
        {} as Record<string, string | null>,
      ),
    }));
  }

  // ── Bulk Import ──

  async importAssets(
    orgId: string,
    items: Array<{
      assetCode: string;
      name: string;
      categoryId: string;
      quantity?: number;
      unit?: string;
      location?: string;
      serialNumber?: string;
      notes?: string;
      condition?: string;
    }>,
    actorUserId: string,
  ) {
    const created = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.asset.create({
          data: {
            orgId,
            assetCode: item.assetCode,
            name: item.name,
            categoryId: item.categoryId,
            quantity: item.quantity ?? 1,
            availableQty: item.quantity ?? 1,
            unit: item.unit,
            location: item.location,
            serialNumber: item.serialNumber,
            notes: item.notes,
            condition: item.condition ?? 'good',
          },
        }),
      ),
    );

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'asset.bulk_imported',
      resource: 'Asset',
      resourceId: 'bulk',
      newValue: { count: created.length } as unknown as Prisma.InputJsonValue,
    });

    return { imported: created.length };
  }

  // ── Custom Fields ──

  async setCustomField(
    orgId: string,
    assetId: string,
    fieldName: string,
    fieldValue: string,
    fieldType = 'text',
  ) {
    const existing = await this.prisma.assetCustomField.findFirst({
      where: { orgId, assetId, fieldName },
    });
    if (existing) {
      return this.prisma.assetCustomField.update({
        where: { id: existing.id },
        data: { fieldValue, fieldType },
      });
    }
    return this.prisma.assetCustomField.create({
      data: { orgId, assetId, fieldName, fieldValue, fieldType },
    });
  }

  // ── Kit Templates ──

  async createKitTemplate(
    orgId: string,
    data: {
      name: string;
      description?: string;
      kitType?: string;
      items?: Array<{ itemName: string; quantity?: number; isRequired?: boolean; notes?: string }>;
    },
    actorUserId: string,
  ) {
    const kit = await this.prisma.kitTemplate.create({
      data: {
        orgId,
        name: data.name,
        description: data.description,
        kitType: data.kitType ?? 'standard',
        createdBy: actorUserId,
        items: data.items
          ? {
              createMany: {
                data: data.items.map((i) => ({
                  orgId,
                  itemName: i.itemName,
                  quantity: i.quantity ?? 1,
                  isRequired: i.isRequired ?? true,
                  notes: i.notes,
                })),
              },
            }
          : undefined,
      },
      include: { items: true },
    });

    return kit;
  }

  async getKitTemplates(orgId: string) {
    return this.prisma.kitTemplate.findMany({
      where: { orgId, isActive: true },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Maintenance Schedule ──

  async createMaintenanceSchedule(
    orgId: string,
    data: {
      assetId: string;
      maintenanceType: string;
      frequency?: string;
      nextDue: string;
      assignedTo?: string;
      notes?: string;
    },
  ) {
    return this.prisma.maintenanceSchedule.create({
      data: {
        orgId,
        assetId: data.assetId,
        maintenanceType: data.maintenanceType,
        frequency: data.frequency ?? 'monthly',
        nextDue: new Date(data.nextDue),
        assignedTo: data.assignedTo,
        notes: data.notes,
      },
    });
  }

  async getMaintenanceSchedules(orgId: string, filters?: { status?: string }) {
    const where: Prisma.MaintenanceScheduleWhereInput = { orgId };
    if (filters?.status) where.status = filters.status;
    return this.prisma.maintenanceSchedule.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, assetCode: true } },
      } as Prisma.MaintenanceScheduleInclude,
      orderBy: { nextDue: 'asc' },
    });
  }

  // T-1089: Complete maintenance task and reschedule
  async completeMaintenanceTask(orgId: string, scheduleId: string, actorUserId: string) {
    const schedule = await this.prisma.maintenanceSchedule.findFirst({
      where: { id: scheduleId, orgId },
    });
    if (!schedule) throw new NotFoundException('Maintenance schedule not found');

    const now = new Date();
    // Calculate next due based on frequency
    const freqDays: Record<string, number> = {
      daily: 1,
      weekly: 7,
      biweekly: 14,
      monthly: 30,
      quarterly: 90,
      yearly: 365,
    };
    const days = freqDays[schedule.frequency] ?? 30;
    const nextDue = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: { status: 'completed', lastPerformed: now, nextDue },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'asset.maintenance_completed',
      resource: 'MaintenanceSchedule',
      resourceId: scheduleId,
    });

    return updated;
  }

  // ── T-1092: Uniform Issue/Return ──

  async issueUniform(
    orgId: string,
    data: {
      memberId: string;
      uniformType: string;
      size: string;
      quantity?: number;
      issuedDate?: string;
      notes?: string;
    },
    actorUserId: string,
  ) {
    const uniform = await this.prisma.uniformIssue.create({
      data: {
        orgId,
        memberId: data.memberId,
        uniformType: data.uniformType,
        size: data.size,
        quantity: data.quantity ?? 1,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : new Date(),
        notes: data.notes,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'asset.uniform_issued',
      resource: 'UniformIssue',
      resourceId: uniform.id,
    });

    return uniform;
  }

  async returnUniform(
    orgId: string,
    uniformId: string,
    data: { status?: string; notes?: string },
    actorUserId: string,
  ) {
    const uniform = await this.prisma.uniformIssue.findFirst({
      where: { id: uniformId, orgId },
    });
    if (!uniform) throw new NotFoundException('Uniform issue not found');

    const updated = await this.prisma.uniformIssue.update({
      where: { id: uniformId },
      data: {
        status: data.status ?? 'returned',
        returnDate: new Date(),
        notes: data.notes ?? uniform.notes,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'asset.uniform_returned',
      resource: 'UniformIssue',
      resourceId: uniformId,
    });

    return updated;
  }

  async getUniformIssues(orgId: string, filters?: { memberId?: string; status?: string }) {
    const where: Prisma.UniformIssueWhereInput = { orgId };
    if (filters?.memberId) where.memberId = filters.memberId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.uniformIssue.findMany({
      where,
      orderBy: { issuedDate: 'desc' },
    });
  }

  // ── T-1094: Stock Threshold Alerts ──

  async getStockAlerts(orgId: string, threshold = 5) {
    const assets = await this.prisma.asset.findMany({
      where: {
        orgId,
        status: { notIn: ['retired', 'disposed'] },
        availableQty: { lte: threshold },
      },
      include: { category: { select: { name: true } } },
      orderBy: { availableQty: 'asc' },
    });

    return {
      alerts: assets.map((a) => ({
        id: a.id,
        assetCode: a.assetCode,
        name: a.name,
        category: a.category.name,
        availableQty: a.availableQty,
        totalQty: a.quantity,
        severity: a.availableQty === 0 ? 'critical' : a.availableQty <= 2 ? 'high' : 'low',
      })),
      totalAlerts: assets.length,
      critical: assets.filter((a) => a.availableQty === 0).length,
    };
  }

  // ── T-1093: Pack/Unpack Checklists ──

  async generatePackChecklist(orgId: string, templateId: string, eventLabel?: string) {
    const kit = await this.prisma.kitTemplate.findFirst({
      where: { id: templateId, orgId, isActive: true },
      include: { items: { orderBy: { isRequired: 'desc' } } },
    });
    if (!kit) throw new NotFoundException('Kit template not found');

    return {
      checklistId: `chk-${kit.id}-${Date.now()}`,
      templateId: kit.id,
      templateName: kit.name,
      eventLabel: eventLabel ?? 'General',
      generatedAt: new Date().toISOString(),
      items: kit.items.map((item) => ({
        itemId: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        isRequired: item.isRequired,
        notes: item.notes,
        packed: false,
        packedAt: null,
        packedBy: null,
      })),
      totalItems: kit.items.length,
      requiredItems: kit.items.filter((i) => i.isRequired).length,
      packedCount: 0,
      isComplete: false,
    };
  }

  async markItemPacked(
    orgId: string,
    checklistItems: Array<{
      itemId: string;
      itemName: string;
      packed: boolean;
      quantity: number;
      isRequired: boolean;
    }>,
    itemId: string,
    packed: boolean,
    actorUserId: string,
  ) {
    const updated = checklistItems.map((item) => {
      if (item.itemId === itemId) {
        return {
          ...item,
          packed,
          packedAt: packed ? new Date().toISOString() : null,
          packedBy: packed ? actorUserId : null,
        };
      }
      return item;
    });

    const packedCount = updated.filter((i) => i.packed).length;
    const requiredPacked = updated.filter((i) => i.isRequired && i.packed).length;
    const requiredTotal = updated.filter((i) => i.isRequired).length;

    return {
      items: updated,
      packedCount,
      totalItems: updated.length,
      requiredPacked,
      requiredTotal,
      isComplete: requiredPacked === requiredTotal,
      completionPercentage: Math.round((packedCount / updated.length) * 100),
    };
  }

  // ── T-1098: CSV Export ──

  async exportAssetsCsv(orgId: string): Promise<string> {
    const assets = await this.prisma.asset.findMany({
      where: { orgId },
      include: { category: { select: { name: true } } },
      orderBy: { assetCode: 'asc' },
    });

    const header = 'asset_code,name,category,status,condition,quantity,available_qty,location,serial_number,unit,notes';
    const rows = assets.map((a) =>
      [
        a.assetCode,
        `"${(a.name ?? '').replace(/"/g, '""')}"`,
        `"${a.category?.name ?? ''}"`,
        a.status,
        a.condition,
        a.quantity,
        a.availableQty,
        `"${(a.location ?? '').replace(/"/g, '""')}"`,
        a.serialNumber ?? '',
        a.unit ?? '',
        `"${(a.notes ?? '').replace(/"/g, '""')}"`,
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }

  async exportLoansCsv(orgId: string): Promise<string> {
    const loans = await this.prisma.assetLoan.findMany({
      where: { orgId },
      include: { asset: { select: { assetCode: true, name: true } } },
      orderBy: { requestedAt: 'desc' },
    });

    const header = 'loan_id,asset_code,asset_name,borrower_id,status,quantity,requested_at,expected_return,actual_return,condition_on_return,guardian_status';
    const rows = loans.map((l) =>
      [
        l.id,
        l.asset?.assetCode ?? '',
        `"${(l.asset?.name ?? '').replace(/"/g, '""')}"`,
        l.borrowerId,
        l.status,
        l.quantity,
        l.requestedAt.toISOString(),
        l.expectedReturn.toISOString(),
        l.actualReturn?.toISOString() ?? '',
        l.conditionOnReturn ?? '',
        l.guardianAcceptanceStatus ?? 'not_required',
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
