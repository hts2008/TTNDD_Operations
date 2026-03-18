import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

/**
 * SOP Document Lifecycle (T-1103):
 * draft → published → superseded | archived
 *
 * SOP Version Lifecycle:
 * draft → review → approved → published
 *                → rejected (back to draft)
 */
const SOP_DOC_TRANSITIONS: Record<string, string[]> = {
  draft: ['published'],
  published: ['superseded', 'archived'],
  superseded: ['archived'],
};

const SOP_VERSION_TRANSITIONS: Record<string, string[]> = {
  draft: ['review'],
  review: ['approved', 'rejected'],
  rejected: ['draft'], // Allow revision
  approved: ['published'],
};

// ── DTOs ──

interface CreateSopDto {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  content?: Record<string, unknown>; // TipTap JSON for initial version
}

interface UpdateSopDto {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

interface CreateVersionDto {
  content: Record<string, unknown>; // TipTap JSON
  changeNotes?: string;
}

interface SopSearchFilters {
  status?: string;
  category?: string;
  tag?: string;
  search?: string; // T-1104: full-text search on title/description
}

@Injectable()
export class SopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventService,
    private readonly audit: AuditService,
  ) {}

  // ── T-1101: SOP Document CRUD ──

  async create(orgId: string, data: CreateSopDto, actorUserId: string) {
    if (!data.title?.trim()) {
      throw new BadRequestException('SOP title is required');
    }

    const doc = await this.prisma.$transaction(async (tx) => {
      const sopDoc = await tx.sopDocument.create({
        data: {
          orgId,
          title: data.title.trim(),
          description: data.description,
          category: data.category,
          tags: data.tags ?? [],
          status: 'draft',
          createdBy: actorUserId,
        },
      });

      // Auto-create version 1 with initial content
      await tx.sopVersion.create({
        data: {
          orgId,
          documentId: sopDoc.id,
          versionNo: 1,
          content: (data.content ?? {}) as Prisma.InputJsonValue,
          status: 'draft',
          createdBy: actorUserId,
        },
      });

      return sopDoc;
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'sop.document_created',
      resource: 'SopDocument',
      resourceId: doc.id,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: 'sop.document.created',
      aggregateId: doc.id,
      aggregateType: 'SopDocument',
      payload: { title: doc.title, category: doc.category },
      actorUserId,
    });

    return this.findById(orgId, doc.id);
  }

  async update(orgId: string, documentId: string, data: UpdateSopDto, actorUserId: string) {
    const existing = await this.findById(orgId, documentId);

    if (existing.status !== 'draft') {
      throw new BadRequestException('Only draft SOPs can be edited. Create a new version instead.');
    }

    const updated = await this.prisma.sopDocument.update({
      where: { id: documentId },
      data: {
        title: data.title?.trim(),
        description: data.description,
        category: data.category,
        tags: data.tags,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'sop.document_updated',
      resource: 'SopDocument',
      resourceId: documentId,
    });

    return updated;
  }

  // ── T-1104: Search & Filter ──

  async findMany(orgId: string, filters?: SopSearchFilters, page = 1, limit = 20) {
    const where: Prisma.SopDocumentWhereInput = { orgId };

    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.tag) where.tags = { has: filters.tag };

    // T-1104: Full-text search on title + description
    if (filters?.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { has: searchTerm } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.sopDocument.findMany({
        where,
        include: {
          versions: {
            orderBy: { versionNo: 'desc' },
            take: 1,
            select: { versionNo: true, status: true, publishedAt: true },
          },
          _count: { select: { versions: true, approvals: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.sopDocument.count({ where }),
    ]);

    return { data, meta: { total, page, limit } };
  }

  async findById(orgId: string, documentId: string) {
    const doc = await this.prisma.sopDocument.findFirst({
      where: { id: documentId, orgId },
      include: {
        versions: { orderBy: { versionNo: 'desc' } },
        approvals: { orderBy: { decidedAt: 'desc' }, take: 10 },
      },
    });
    if (!doc) throw new NotFoundException('SOP document not found');
    return doc;
  }

  // ── T-1102: Version Management (Rich Text + Attachments) ──

  async createVersion(
    orgId: string,
    documentId: string,
    data: CreateVersionDto,
    actorUserId: string,
  ) {
    const doc = await this.findById(orgId, documentId);

    if (doc.status === 'archived') {
      throw new BadRequestException('Cannot add versions to an archived SOP');
    }

    // Get next version number
    const latestVersion = doc.versions[0];
    const nextVersionNo = latestVersion ? latestVersion.versionNo + 1 : 1;

    const version = await this.prisma.sopVersion.create({
      data: {
        orgId,
        documentId,
        versionNo: nextVersionNo,
        content: data.content as Prisma.InputJsonValue,
        changeNotes: data.changeNotes,
        status: 'draft',
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'sop.version_created',
      resource: 'SopVersion',
      resourceId: version.id,
      newValue: { documentId, versionNo: nextVersionNo } as unknown as Prisma.InputJsonValue,
    });

    return version;
  }

  async getVersion(orgId: string, documentId: string, versionNo: number) {
    const version = await this.prisma.sopVersion.findFirst({
      where: { orgId, documentId, versionNo },
      include: { document: { select: { title: true, category: true, tags: true } } },
    });
    if (!version) throw new NotFoundException(`SOP version ${versionNo} not found`);
    return version;
  }

  // ── T-1103: Version Diff / Approval Flow ──

  async submitForReview(orgId: string, documentId: string, versionNo: number, actorUserId: string) {
    const version = await this.getVersion(orgId, documentId, versionNo);
    this.assertVersionTransition(version.status, 'review');

    const updated = await this.prisma.sopVersion.update({
      where: { id: version.id },
      data: { status: 'review' },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'sop.version_submitted_for_review',
      resource: 'SopVersion',
      resourceId: version.id,
      newValue: { versionNo } as unknown as Prisma.InputJsonValue,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: 'sop.version.submitted_for_review',
      aggregateId: documentId,
      aggregateType: 'SopDocument',
      payload: { documentId, versionNo },
      actorUserId,
    });

    return updated;
  }

  async approveVersion(
    orgId: string,
    documentId: string,
    versionNo: number,
    decision: { approved: boolean; comments?: string },
    actorUserId: string,
  ) {
    const version = await this.getVersion(orgId, documentId, versionNo);
    if (version.status !== 'review') {
      throw new BadRequestException('Only versions in review can be approved/rejected');
    }

    const newStatus = decision.approved ? 'approved' : 'rejected';
    this.assertVersionTransition(version.status, newStatus);

    const [updatedVersion] = await this.prisma.$transaction([
      this.prisma.sopVersion.update({
        where: { id: version.id },
        data: { status: newStatus },
      }),
      this.prisma.sopApproval.create({
        data: {
          orgId,
          documentId,
          versionNo,
          approverId: actorUserId,
          decision: decision.approved ? 'approved' : 'rejected',
          comments: decision.comments,
        },
      }),
    ]);

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: decision.approved ? 'sop.version_approved' : 'sop.version_rejected',
      resource: 'SopVersion',
      resourceId: version.id,
      newValue: { versionNo, comments: decision.comments } as unknown as Prisma.InputJsonValue,
    });

    return updatedVersion;
  }

  async publishVersion(orgId: string, documentId: string, versionNo: number, actorUserId: string) {
    const version = await this.getVersion(orgId, documentId, versionNo);
    if (version.status !== 'approved') {
      throw new BadRequestException('Only approved versions can be published');
    }

    // Transition: version → published, document → published
    const [updatedVersion] = await this.prisma.$transaction([
      this.prisma.sopVersion.update({
        where: { id: version.id },
        data: { status: 'published', publishedAt: new Date() },
      }),
      this.prisma.sopDocument.update({
        where: { id: documentId },
        data: { status: 'published' },
      }),
    ]);

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'sop.version_published',
      resource: 'SopVersion',
      resourceId: version.id,
      newValue: { documentId, versionNo } as unknown as Prisma.InputJsonValue,
    });

    await this.domainEvents.publish({
      orgId,
      eventType: 'sop.version.published',
      aggregateId: documentId,
      aggregateType: 'SopDocument',
      payload: { documentId, versionNo },
      actorUserId,
    });

    return updatedVersion;
  }

  // ── T-1103: Version Diff ──

  async diffVersions(orgId: string, documentId: string, fromVersion: number, toVersion: number) {
    const [from, to] = await Promise.all([
      this.getVersion(orgId, documentId, fromVersion),
      this.getVersion(orgId, documentId, toVersion),
    ]);

    return {
      from: {
        versionNo: from.versionNo,
        content: from.content,
        status: from.status,
        createdAt: from.createdAt,
      },
      to: {
        versionNo: to.versionNo,
        content: to.content,
        status: to.status,
        createdAt: to.createdAt,
        changeNotes: to.changeNotes,
      },
    };
  }

  // ── Document Lifecycle ──

  async archiveDocument(orgId: string, documentId: string, actorUserId: string) {
    const doc = await this.findById(orgId, documentId);
    this.assertDocTransition(doc.status, 'archived');

    const updated = await this.prisma.sopDocument.update({
      where: { id: documentId },
      data: { status: 'archived' },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'sop.document_archived',
      resource: 'SopDocument',
      resourceId: documentId,
    });

    return updated;
  }

  // ── T-1104: Categories & Tags ──

  async findCategories(orgId: string) {
    const docs = await this.prisma.sopDocument.findMany({
      where: { orgId },
      select: { category: true },
      distinct: ['category'],
    });
    return docs.map((d: { category: string | null }) => d.category).filter(Boolean);
  }

  async findTags(orgId: string) {
    const docs = await this.prisma.sopDocument.findMany({
      where: { orgId },
      select: { tags: true },
    });
    const allTags = new Set<string>();
    docs.forEach((d: { tags: string[] }) => d.tags.forEach((t: string) => allTags.add(t)));
    return Array.from(allTags).sort();
  }

  // ── Helpers ──

  private assertDocTransition(currentStatus: string, targetStatus: string): void {
    const allowed = SOP_DOC_TRANSITIONS[currentStatus];
    if (!allowed?.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition SOP document from '${currentStatus}' to '${targetStatus}'`,
      );
    }
  }

  private assertVersionTransition(currentStatus: string, targetStatus: string): void {
    const allowed = SOP_VERSION_TRANSITIONS[currentStatus];
    if (!allowed?.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition SOP version from '${currentStatus}' to '${targetStatus}'`,
      );
    }
  }
}
