import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SopService } from './sop.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

describe('SopService', () => {
  let service: SopService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };

  const ORG_ID = 'org-test-1';
  const USER_ID = 'user-test-1';

  beforeEach(async () => {
    prisma = {
      sopDocument: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      sopVersion: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      sopApproval: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SopService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<SopService>(SopService);
  });

  // ── SOP Document CRUD ──

  describe('create', () => {
    it('should create SOP with auto-version 1', async () => {
      const sopDoc = {
        id: 'sop-1',
        orgId: ORG_ID,
        title: 'Hướng dẫn An toàn Trại',
        status: 'draft',
      };
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
        const tx = {
          sopDocument: { create: jest.fn().mockResolvedValue(sopDoc) },
          sopVersion: { create: jest.fn().mockResolvedValue({ id: 'v-1', versionNo: 1 }) },
        };
        return cb(tx);
      });
      prisma.sopDocument.findFirst.mockResolvedValue({
        ...sopDoc,
        versions: [{ versionNo: 1, status: 'draft' }],
        approvals: [],
      });

      const result = await service.create(
        ORG_ID,
        {
          title: 'Hướng dẫn An toàn Trại',
          category: 'safety',
        },
        USER_ID,
      );

      expect(result.title).toBe('Hướng dẫn An toàn Trại');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'sop.document_created' }),
      );
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'sop.document.created' }),
      );
    });

    it('should reject empty title', async () => {
      await expect(service.create(ORG_ID, { title: '' }, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update draft SOP', async () => {
      prisma.sopDocument.findFirst.mockResolvedValue({
        id: 'sop-1',
        orgId: ORG_ID,
        status: 'draft',
        versions: [],
        approvals: [],
      });
      prisma.sopDocument.update.mockResolvedValue({
        id: 'sop-1',
        title: 'Updated Title',
      });

      const result = await service.update(ORG_ID, 'sop-1', { title: 'Updated Title' }, USER_ID);
      expect(result.title).toBe('Updated Title');
    });

    it('should reject editing published SOP', async () => {
      prisma.sopDocument.findFirst.mockResolvedValue({
        id: 'sop-1',
        orgId: ORG_ID,
        status: 'published',
        versions: [],
        approvals: [],
      });

      await expect(service.update(ORG_ID, 'sop-1', { title: 'X' }, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── Search & Filter ──

  describe('findMany', () => {
    it('should filter by category', async () => {
      prisma.sopDocument.findMany.mockResolvedValue([]);
      prisma.sopDocument.count.mockResolvedValue(0);

      await service.findMany(ORG_ID, { category: 'safety' });

      expect(prisma.sopDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'safety' }),
        }),
      );
    });

    it('should support full-text search', async () => {
      prisma.sopDocument.findMany.mockResolvedValue([]);
      prisma.sopDocument.count.mockResolvedValue(0);

      await service.findMany(ORG_ID, { search: 'an toàn' });

      expect(prisma.sopDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'an toàn', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });
  });

  // ── Version Management ──

  describe('createVersion', () => {
    it('should increment version number', async () => {
      prisma.sopDocument.findFirst.mockResolvedValue({
        id: 'sop-1',
        orgId: ORG_ID,
        status: 'published',
        versions: [{ versionNo: 2, status: 'published' }],
        approvals: [],
      });
      prisma.sopVersion.create.mockResolvedValue({
        id: 'v-3',
        versionNo: 3,
        status: 'draft',
      });

      const result = await service.createVersion(
        ORG_ID,
        'sop-1',
        {
          content: { type: 'doc', content: [] },
        },
        USER_ID,
      );

      expect(result.versionNo).toBe(3);
    });

    it('should reject version for archived SOP', async () => {
      prisma.sopDocument.findFirst.mockResolvedValue({
        id: 'sop-1',
        orgId: ORG_ID,
        status: 'archived',
        versions: [],
        approvals: [],
      });

      await expect(
        service.createVersion(ORG_ID, 'sop-1', { content: {} }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Approval Flow ──

  describe('submitForReview', () => {
    it('should transition draft version to review', async () => {
      prisma.sopVersion.findFirst.mockResolvedValue({
        id: 'v-1',
        orgId: ORG_ID,
        documentId: 'sop-1',
        versionNo: 2,
        status: 'draft',
      });
      prisma.sopVersion.update.mockResolvedValue({ id: 'v-1', status: 'review' });

      const result = await service.submitForReview(ORG_ID, 'sop-1', 2, USER_ID);

      expect(result.status).toBe('review');
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'sop.version.submitted_for_review' }),
      );
    });
  });

  describe('approveVersion', () => {
    it('should approve a version in review', async () => {
      prisma.sopVersion.findFirst.mockResolvedValue({
        id: 'v-1',
        orgId: ORG_ID,
        documentId: 'sop-1',
        versionNo: 2,
        status: 'review',
      });
      prisma.$transaction.mockResolvedValue([{ id: 'v-1', status: 'approved' }, { id: 'appr-1' }]);

      const result = await service.approveVersion(
        ORG_ID,
        'sop-1',
        2,
        { approved: true, comments: 'LGTM' },
        USER_ID,
      );

      expect(result.status).toBe('approved');
    });

    it('should reject a version in review', async () => {
      prisma.sopVersion.findFirst.mockResolvedValue({
        id: 'v-1',
        orgId: ORG_ID,
        documentId: 'sop-1',
        versionNo: 2,
        status: 'review',
      });
      prisma.$transaction.mockResolvedValue([{ id: 'v-1', status: 'rejected' }, { id: 'appr-1' }]);

      const result = await service.approveVersion(
        ORG_ID,
        'sop-1',
        2,
        { approved: false, comments: 'Cần sửa' },
        USER_ID,
      );

      expect(result.status).toBe('rejected');
    });

    it('should reject approving non-review version', async () => {
      prisma.sopVersion.findFirst.mockResolvedValue({
        id: 'v-1',
        orgId: ORG_ID,
        status: 'draft',
        versionNo: 1,
      });

      await expect(
        service.approveVersion(ORG_ID, 'sop-1', 1, { approved: true }, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Document Lifecycle ──

  describe('archiveDocument', () => {
    it('should archive a published SOP', async () => {
      prisma.sopDocument.findFirst.mockResolvedValue({
        id: 'sop-1',
        orgId: ORG_ID,
        status: 'published',
        versions: [],
        approvals: [],
      });
      prisma.sopDocument.update.mockResolvedValue({ id: 'sop-1', status: 'archived' });

      const result = await service.archiveDocument(ORG_ID, 'sop-1', USER_ID);
      expect(result.status).toBe('archived');
    });

    it('should reject archiving a draft SOP', async () => {
      prisma.sopDocument.findFirst.mockResolvedValue({
        id: 'sop-1',
        orgId: ORG_ID,
        status: 'draft',
        versions: [],
        approvals: [],
      });

      await expect(service.archiveDocument(ORG_ID, 'sop-1', USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
