import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssetsService } from './assets.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

describe('AssetsService', () => {
  let service: AssetsService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };

  const ORG_ID = 'org-asset-1';
  const USER_ID = 'user-asset-1';

  beforeEach(async () => {
    prisma = {
      assetCategory: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      asset: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      assetLoan: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      assetCustomField: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      kitTemplate: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      maintenanceSchedule: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      uniformIssue: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  // ── Categories ──

  describe('createCategory', () => {
    it('should create category and log audit', async () => {
      prisma.assetCategory.create.mockResolvedValue({
        id: 'cat-1', orgId: ORG_ID, name: 'Lều trại',
      });

      const result = await service.createCategory(ORG_ID, { name: 'Lều trại' }, USER_ID);

      expect(result.name).toBe('Lều trại');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'asset.category_created', resource: 'AssetCategory' }),
      );
    });
  });

  describe('getCategories', () => {
    it('should list categories with asset count', async () => {
      prisma.assetCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Lều', _count: { assets: 5 } },
        { id: 'cat-2', name: 'Dây thừng', _count: { assets: 12 } },
      ]);

      const result = await service.getCategories(ORG_ID);

      expect(result).toHaveLength(2);
      expect(prisma.assetCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: ORG_ID } }),
      );
    });
  });

  // ── Assets CRUD ──

  describe('createAsset', () => {
    it('should create asset with quantity tracking', async () => {
      const data = {
        name: 'Lều 4 người', assetCode: 'TENT-001',
        categoryId: 'cat-1', quantity: 5,
      };
      prisma.asset.create.mockResolvedValue({
        id: 'asset-1', orgId: ORG_ID, ...data,
        availableQty: 5, status: 'available',
      });

      const result = await service.createAsset(ORG_ID, data, USER_ID);

      expect(result.availableQty).toBe(5);
      expect(prisma.asset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ quantity: 5, availableQty: 5 }),
      });
    });
  });

  describe('updateAsset', () => {
    it('should update specific fields without overwriting others', async () => {
      prisma.asset.findFirst.mockResolvedValue({
        id: 'asset-1', orgId: ORG_ID, name: 'Old',
      });
      prisma.asset.update.mockResolvedValue({
        id: 'asset-1', name: 'Lều 6 người', condition: 'good',
      });

      const result = await service.updateAsset(ORG_ID, 'asset-1', { name: 'Lều 6 người' }, USER_ID);

      expect(result.name).toBe('Lều 6 người');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'asset.asset_updated' }),
      );
    });

    it('should throw NotFoundException for missing asset', async () => {
      prisma.asset.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAsset(ORG_ID, 'no-exist', { name: 'X' }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('retireAsset', () => {
    it('should soft-delete by setting status to retired', async () => {
      prisma.asset.findFirst.mockResolvedValue({ id: 'asset-1', orgId: ORG_ID });
      prisma.asset.update.mockResolvedValue({ id: 'asset-1', status: 'retired' });

      const result = await service.retireAsset(ORG_ID, 'asset-1', USER_ID);

      expect(result.status).toBe('retired');
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
        data: { status: 'retired' },
      });
    });
  });

  describe('disposeAsset', () => {
    it('should dispose and publish domain event', async () => {
      prisma.asset.findFirst.mockResolvedValue({ id: 'asset-1', orgId: ORG_ID });
      prisma.asset.update.mockResolvedValue({ id: 'asset-1', status: 'disposed' });

      await service.disposeAsset(ORG_ID, 'asset-1', { reason: 'donated', notes: 'To school' }, USER_ID);

      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'asset.asset_reported_lost',
          payload: expect.objectContaining({ reason: 'donated' }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'asset.asset_disposed' }),
      );
    });
  });

  // ── Loans (SM-8) ──

  describe('createLoan', () => {
    it('should create loan when sufficient quantity', async () => {
      prisma.asset.findFirst.mockResolvedValue({
        id: 'asset-1', orgId: ORG_ID, availableQty: 3,
        category: {}, loans: [],
      });
      prisma.assetLoan.create.mockResolvedValue({
        id: 'loan-1', status: 'pending', quantity: 2,
      });

      const result = await service.createLoan(ORG_ID, {
        assetId: 'asset-1', borrowerId: 'member-1',
        expectedReturn: '2026-06-15', quantity: 2,
      }, USER_ID);

      expect(result.status).toBe('pending');
    });

    it('should reject when insufficient quantity', async () => {
      prisma.asset.findFirst.mockResolvedValue({
        id: 'asset-1', orgId: ORG_ID, availableQty: 1,
        category: {}, loans: [],
      });

      await expect(
        service.createLoan(ORG_ID, {
          assetId: 'asset-1', borrowerId: 'member-1',
          expectedReturn: '2026-06-15', quantity: 5,
        }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transitionLoan (SM-8)', () => {
    it('should approve a pending loan', async () => {
      prisma.assetLoan.findFirst.mockResolvedValue({
        id: 'loan-1', orgId: ORG_ID, status: 'pending',
        assetId: 'asset-1', borrowerId: 'member-1', quantity: 1,
      });
      prisma.assetLoan.update.mockResolvedValue({ id: 'loan-1', status: 'approved' });

      const result = await service.transitionLoan(ORG_ID, 'loan-1', 'approve', USER_ID);

      expect(result.status).toBe('approved');
    });

    it('should checkout — decrement availableQty + publish event', async () => {
      prisma.assetLoan.findFirst.mockResolvedValue({
        id: 'loan-1', orgId: ORG_ID, status: 'approved',
        assetId: 'asset-1', borrowerId: 'member-1', quantity: 2,
      });
      prisma.assetLoan.update.mockResolvedValue({ id: 'loan-1', status: 'checked_out' });
      prisma.asset.update.mockResolvedValue({});

      await service.transitionLoan(ORG_ID, 'loan-1', 'checkout', USER_ID);

      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
        data: { availableQty: { decrement: 2 } },
      });
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'asset.asset_checked_out' }),
      );
    });

    it('should return — increment availableQty + publish event', async () => {
      prisma.assetLoan.findFirst.mockResolvedValue({
        id: 'loan-1', orgId: ORG_ID, status: 'checked_out',
        assetId: 'asset-1', borrowerId: 'member-1', quantity: 2,
      });
      prisma.assetLoan.update.mockResolvedValue({ id: 'loan-1', status: 'returned' });
      prisma.asset.update.mockResolvedValue({});

      await service.transitionLoan(ORG_ID, 'loan-1', 'return', USER_ID, {
        conditionOnReturn: 'good',
      });

      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: 'asset-1' },
        data: { availableQty: { increment: 2 } },
      });
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'asset.asset_returned' }),
      );
    });

    it('should report_lost — publish lost event', async () => {
      prisma.assetLoan.findFirst.mockResolvedValue({
        id: 'loan-1', orgId: ORG_ID, status: 'checked_out',
        assetId: 'asset-1', borrowerId: 'member-1', quantity: 1,
      });
      prisma.assetLoan.update.mockResolvedValue({ id: 'loan-1', status: 'lost' });

      await service.transitionLoan(ORG_ID, 'loan-1', 'report_lost', USER_ID);

      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'asset.asset_reported_lost' }),
      );
    });

    it('should reject invalid SM-8 transition', async () => {
      prisma.assetLoan.findFirst.mockResolvedValue({
        id: 'loan-1', orgId: ORG_ID, status: 'returned',
        assetId: 'asset-1', borrowerId: 'member-1', quantity: 1,
      });

      await expect(
        service.transitionLoan(ORG_ID, 'loan-1', 'checkout', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Guardian Acceptance ──

  describe('guardianAcceptLoan', () => {
    it('should accept guardian for minor borrower', async () => {
      prisma.assetLoan.findFirst.mockResolvedValue({
        id: 'loan-1', orgId: ORG_ID, guardianAcceptanceStatus: 'pending',
        assetId: 'asset-1',
      });
      prisma.assetLoan.update.mockResolvedValue({
        id: 'loan-1', guardianAcceptanceStatus: 'accepted',
      });

      const result = await service.guardianAcceptLoan(ORG_ID, 'loan-1', 'accept', USER_ID);

      expect(result.guardianAcceptanceStatus).toBe('accepted');
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'asset.guardian_accepted' }),
      );
    });

    it('should reject guardian — loan rejected + notes', async () => {
      prisma.assetLoan.findFirst.mockResolvedValue({
        id: 'loan-1', orgId: ORG_ID, guardianAcceptanceStatus: 'pending',
        assetId: 'asset-1',
      });
      prisma.assetLoan.update.mockResolvedValue({
        id: 'loan-1', guardianAcceptanceStatus: 'rejected', status: 'rejected',
      });

      await service.guardianAcceptLoan(ORG_ID, 'loan-1', 'reject', USER_ID, 'Too young');

      expect(prisma.assetLoan.update).toHaveBeenCalledWith({
        where: { id: 'loan-1' },
        data: expect.objectContaining({
          guardianAcceptanceStatus: 'rejected',
          returnNotes: 'Too young',
          status: 'rejected',
        }),
      });
    });

    it('should reject if already accepted', async () => {
      prisma.assetLoan.findFirst.mockResolvedValue({
        id: 'loan-1', orgId: ORG_ID, guardianAcceptanceStatus: 'accepted',
      });

      await expect(
        service.guardianAcceptLoan(ORG_ID, 'loan-1', 'accept', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Inventory ──

  describe('getInventorySummary', () => {
    it('should aggregate by category', async () => {
      prisma.asset.findMany.mockResolvedValue([
        { quantity: 10, availableQty: 7, category: { name: 'Lều' } },
        { quantity: 5, availableQty: 5, category: { name: 'Dây thừng' } },
        { quantity: 3, availableQty: 1, category: { name: 'Lều' } },
      ]);

      const result = await service.getInventorySummary(ORG_ID);

      expect(result.totals.total).toBe(18);
      expect(result.totals.available).toBe(13);
      expect(result.totals.onLoan).toBe(5);
      expect(result.byCategory['Lều'].total).toBe(13);
      expect(result.byCategory['Lều'].onLoan).toBe(5);
      expect(result.assetCount).toBe(3);
    });
  });

  describe('getStockAlerts', () => {
    it('should return low-stock and critical alerts', async () => {
      prisma.asset.findMany.mockResolvedValue([
        { id: 'a1', assetCode: 'T-01', name: 'Tent A', availableQty: 0, quantity: 5, category: { name: 'Lều' } },
        { id: 'a2', assetCode: 'R-01', name: 'Rope B', availableQty: 2, quantity: 10, category: { name: 'Dây' } },
      ]);

      const result = await service.getStockAlerts(ORG_ID, 5);

      expect(result.totalAlerts).toBe(2);
      expect(result.critical).toBe(1);
      expect(result.alerts[0].severity).toBe('critical');
      expect(result.alerts[1].severity).toBe('high');
    });
  });

  // ── Import / Export ──

  describe('importAssets', () => {
    it('should bulk import via $transaction', async () => {
      const items = [
        { assetCode: 'A-001', name: 'Item 1', categoryId: 'cat-1' },
        { assetCode: 'A-002', name: 'Item 2', categoryId: 'cat-1' },
      ];
      prisma.$transaction.mockResolvedValue([
        { id: 'new-1' }, { id: 'new-2' },
      ]);

      const result = await service.importAssets(ORG_ID, items, USER_ID);

      expect(result.imported).toBe(2);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'asset.bulk_imported' }),
      );
    });
  });

  describe('exportAssetsCsv', () => {
    it('should return CSV with header and rows', async () => {
      prisma.asset.findMany.mockResolvedValue([
        {
          assetCode: 'T-01', name: 'Tent', status: 'available',
          condition: 'good', quantity: 5, availableQty: 3,
          location: 'Kho A', serialNumber: null, unit: 'cái',
          notes: null, category: { name: 'Lều' },
        },
      ]);

      const csv = await service.exportAssetsCsv(ORG_ID);

      expect(csv).toContain('asset_code,name,category');
      expect(csv).toContain('T-01');
      expect(csv).toContain('"Lều"');
    });
  });

  // ── Kits ──

  describe('createKitTemplate', () => {
    it('should create kit with nested items', async () => {
      prisma.kitTemplate.create.mockResolvedValue({
        id: 'kit-1', name: 'Kit Trại Hè',
        items: [
          { id: 'i1', itemName: 'Lều', quantity: 2, isRequired: true },
          { id: 'i2', itemName: 'Nồi', quantity: 1, isRequired: false },
        ],
      });

      const result = await service.createKitTemplate(ORG_ID, {
        name: 'Kit Trại Hè',
        items: [
          { itemName: 'Lều', quantity: 2 },
          { itemName: 'Nồi', quantity: 1, isRequired: false },
        ],
      }, USER_ID);

      expect(result.items).toHaveLength(2);
      expect(prisma.kitTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId: ORG_ID,
            name: 'Kit Trại Hè',
            items: expect.objectContaining({
              createMany: expect.any(Object),
            }),
          }),
        }),
      );
    });
  });

  // ── Maintenance ──

  describe('completeMaintenanceTask', () => {
    it('should complete and reschedule based on frequency', async () => {
      const nextDue = new Date('2026-03-01');
      prisma.maintenanceSchedule.findFirst.mockResolvedValue({
        id: 'sched-1', orgId: ORG_ID, frequency: 'weekly', nextDue,
      });
      prisma.maintenanceSchedule.update.mockResolvedValue({
        id: 'sched-1', status: 'completed', lastPerformed: expect.any(Date),
      });

      await service.completeMaintenanceTask(ORG_ID, 'sched-1', USER_ID);

      expect(prisma.maintenanceSchedule.update).toHaveBeenCalledWith({
        where: { id: 'sched-1' },
        data: expect.objectContaining({
          status: 'completed',
          lastPerformed: expect.any(Date),
          nextDue: expect.any(Date),
        }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'asset.maintenance_completed' }),
      );
    });

    it('should throw NotFoundException for missing schedule', async () => {
      prisma.maintenanceSchedule.findFirst.mockResolvedValue(null);

      await expect(
        service.completeMaintenanceTask(ORG_ID, 'no-exist', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Uniform ──

  describe('issueUniform', () => {
    it('should issue uniform and log audit', async () => {
      prisma.uniformIssue.create.mockResolvedValue({
        id: 'uni-1', orgId: ORG_ID, uniformType: 'Áo trắng',
        size: 'M', quantity: 1, status: 'issued',
      });

      const result = await service.issueUniform(ORG_ID, {
        memberId: 'member-1', uniformType: 'Áo trắng', size: 'M',
      }, USER_ID);

      expect(result.status).toBe('issued');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'asset.uniform_issued' }),
      );
    });
  });

  describe('returnUniform', () => {
    it('should return uniform with date set', async () => {
      prisma.uniformIssue.findFirst.mockResolvedValue({
        id: 'uni-1', orgId: ORG_ID, status: 'issued', notes: null,
      });
      prisma.uniformIssue.update.mockResolvedValue({
        id: 'uni-1', status: 'returned', returnDate: new Date(),
      });

      const result = await service.returnUniform(ORG_ID, 'uni-1', {}, USER_ID);

      expect(result.status).toBe('returned');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'asset.uniform_returned' }),
      );
    });

    it('should throw NotFoundException for missing uniform issue', async () => {
      prisma.uniformIssue.findFirst.mockResolvedValue(null);

      await expect(
        service.returnUniform(ORG_ID, 'no-exist', {}, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
