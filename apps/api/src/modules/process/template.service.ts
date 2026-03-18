import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';
import { AuditService } from '../../core/audit';
import {
  type WorkflowNode,
  type WorkflowEdge,
  type WorkflowTrigger,
  WorkflowExecutorService,
} from './workflow-executor.service';

// ══════════════════════════════════════════════
// T-1111: Template Catalog Service
// T-1112: Import/Export JSON
// ══════════════════════════════════════════════

@Injectable()
export class TemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly executor: WorkflowExecutorService,
  ) {}

  // ── T-1111: Template Catalog ──

  async findAll(category?: string) {
    return this.prisma.workflowTemplate.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findBySlug(slug: string) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { slug },
    });
    if (!template) throw new NotFoundException(`Template '${slug}' not found`);
    return template;
  }

  async installTemplate(orgId: string, slug: string, actorUserId: string) {
    const template = await this.findBySlug(slug);

    const nodes = template.nodesJson as unknown as WorkflowNode[];
    const edges = template.edgesJson as unknown as WorkflowEdge[];

    // Validate the graph before installing
    const validation = this.executor.validateGraph(nodes, edges);
    if (!validation.valid) {
      throw new BadRequestException(`Template graph invalid: ${validation.errors.join('; ')}`);
    }

    // Create a new WorkflowDefinition from the template
    const definition = await this.prisma.workflowDefinition.create({
      data: {
        orgId,
        name: template.name,
        description: template.description ?? `Installed from template: ${template.slug}`,
        steps: {} as Prisma.InputJsonValue,
        nodesJson: template.nodesJson as unknown as Prisma.InputJsonValue,
        edgesJson: template.edgesJson as unknown as Prisma.InputJsonValue,
        triggersJson: template.triggersJson as unknown as Prisma.InputJsonValue,
        isActive: true,
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'process.template_installed',
      resource: 'WorkflowDefinition',
      resourceId: definition.id,
      newValue: {
        templateSlug: slug,
        templateName: template.name,
      } as unknown as Prisma.InputJsonValue,
    });

    return definition;
  }

  async createOrgTemplate(
    orgId: string,
    data: {
      slug: string;
      name: string;
      description?: string;
      category: string;
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      triggers?: WorkflowTrigger[];
    },
    actorUserId: string,
  ) {
    // Validate graph
    const validation = this.executor.validateGraph(data.nodes, data.edges);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid graph: ${validation.errors.join('; ')}`);
    }

    // Check slug uniqueness
    const existing = await this.prisma.workflowTemplate.findUnique({ where: { slug: data.slug } });
    if (existing) {
      throw new ConflictException(`Template slug '${data.slug}' already exists`);
    }

    const template = await this.prisma.workflowTemplate.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        category: data.category,
        nodesJson: data.nodes as unknown as Prisma.InputJsonValue,
        edgesJson: data.edges as unknown as Prisma.InputJsonValue,
        triggersJson: (data.triggers ?? []) as unknown as Prisma.InputJsonValue,
        isBuiltIn: false,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'process.template_created',
      resource: 'WorkflowTemplate',
      resourceId: template.id,
      newValue: { slug: data.slug } as unknown as Prisma.InputJsonValue,
    });

    return template;
  }

  // ── T-1112: Import/Export JSON ──

  async exportDefinition(orgId: string, definitionId: string) {
    const definition = await this.prisma.workflowDefinition.findFirst({
      where: { id: definitionId, orgId },
    });
    if (!definition) throw new NotFoundException('Definition not found');

    return {
      name: definition.name,
      description: definition.description,
      nodes: definition.nodesJson,
      edges: definition.edgesJson,
      triggers: definition.triggersJson,
      version: definition.version,
      exportedAt: new Date().toISOString(),
    };
  }

  async importDefinition(
    orgId: string,
    json: {
      name: string;
      description?: string;
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
      triggers?: WorkflowTrigger[];
    },
    actorUserId: string,
  ) {
    // Validate
    const validation = this.executor.validateGraph(json.nodes, json.edges);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid imported graph: ${validation.errors.join('; ')}`);
    }

    const definition = await this.prisma.workflowDefinition.create({
      data: {
        orgId,
        name: json.name,
        description: json.description ?? 'Imported workflow',
        steps: {} as Prisma.InputJsonValue,
        nodesJson: json.nodes as unknown as Prisma.InputJsonValue,
        edgesJson: json.edges as unknown as Prisma.InputJsonValue,
        triggersJson: (json.triggers ?? []) as unknown as Prisma.InputJsonValue,
        isActive: false, // imported as inactive until user activates
        createdBy: actorUserId,
      },
    });

    await this.audit.log({
      orgId,
      userId: actorUserId,
      action: 'process.definition_imported',
      resource: 'WorkflowDefinition',
      resourceId: definition.id,
      newValue: { name: json.name } as unknown as Prisma.InputJsonValue,
    });

    return definition;
  }

  // ── T-1113: Seed Templates (called during init / migration) ──

  async seedBuiltInTemplates() {
    const templates = this.getBuiltInTemplates();
    let created = 0;

    for (const t of templates) {
      const exists = await this.prisma.workflowTemplate.findUnique({ where: { slug: t.slug } });
      if (!exists) {
        await this.prisma.workflowTemplate.create({
          data: {
            slug: t.slug,
            name: t.name,
            description: t.description,
            category: t.category,
            isBuiltIn: t.isBuiltIn,
            nodesJson: t.nodesJson as unknown as Prisma.InputJsonValue,
            edgesJson: t.edgesJson as unknown as Prisma.InputJsonValue,
            triggersJson: t.triggersJson as unknown as Prisma.InputJsonValue,
          },
        });
        created++;
      }
    }

    return { seeded: created, total: templates.length };
  }

  private getBuiltInTemplates() {
    return [
      {
        slug: 'onboarding-member',
        name: 'Tiếp nhận đoàn sinh mới',
        description: 'Quy trình tiếp nhận, xét duyệt và chào mừng đoàn sinh mới',
        category: 'onboarding',
        isBuiltIn: true,
        nodesJson: [
          { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 250, y: 0 }, data: {} },
          {
            id: 't1',
            type: 'task',
            label: 'Điền đơn đăng ký',
            position: { x: 250, y: 100 },
            data: { assigneeRole: 'member', description: 'Phụ huynh/đoàn sinh điền đơn đăng ký' },
          },
          {
            id: 'a1',
            type: 'approval',
            label: 'Trưởng đơn vị duyệt',
            position: { x: 250, y: 200 },
            data: { assigneeRole: 'leader' },
          },
          {
            id: 'n1',
            type: 'notification',
            label: 'Thông báo chào mừng',
            position: { x: 250, y: 300 },
            data: { notificationTemplate: 'welcome_new_member', notificationChannel: 'in_app' },
          },
          { id: 'e1', type: 'end', label: 'Hoàn tất', position: { x: 250, y: 400 }, data: {} },
        ],
        edgesJson: [
          { id: 'e-s1-t1', source: 's1', target: 't1' },
          { id: 'e-t1-a1', source: 't1', target: 'a1' },
          { id: 'e-a1-n1', source: 'a1', target: 'n1' },
          { id: 'e-n1-e1', source: 'n1', target: 'e1' },
        ],
        triggersJson: [],
      },
      {
        slug: 'fee-reminder',
        name: 'Nhắc đóng phí sinh hoạt',
        description: 'Tự động nhắc phụ huynh đóng phí, leo thang nếu chưa thanh toán',
        category: 'finance',
        isBuiltIn: true,
        nodesJson: [
          { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 250, y: 0 }, data: {} },
          {
            id: 'd1',
            type: 'delay',
            label: 'Chờ 7 ngày',
            position: { x: 250, y: 100 },
            data: { delayMinutes: 10080 },
          },
          {
            id: 'n1',
            type: 'notification',
            label: 'Gửi nhắc nhở',
            position: { x: 250, y: 200 },
            data: { notificationTemplate: 'fee_reminder', notificationChannel: 'email' },
          },
          {
            id: 'c1',
            type: 'condition',
            label: 'Đã thanh toán?',
            position: { x: 250, y: 300 },
            data: { conditionField: 'paid', conditionOperator: '==', conditionValue: 'true' },
          },
          { id: 'e1', type: 'end', label: 'Hoàn tất', position: { x: 100, y: 400 }, data: {} },
          {
            id: 'n2',
            type: 'notification',
            label: 'Leo thang cho Admin',
            position: { x: 400, y: 400 },
            data: { notificationTemplate: 'fee_escalation', notificationChannel: 'in_app' },
          },
          {
            id: 'e2',
            type: 'end',
            label: 'Kết thúc (leo thang)',
            position: { x: 400, y: 500 },
            data: {},
          },
        ],
        edgesJson: [
          { id: 'e-s1-d1', source: 's1', target: 'd1' },
          { id: 'e-d1-n1', source: 'd1', target: 'n1' },
          { id: 'e-n1-c1', source: 'n1', target: 'c1' },
          { id: 'e-c1-e1', source: 'c1', target: 'e1', sourceHandle: 'true' },
          { id: 'e-c1-n2', source: 'c1', target: 'n2', sourceHandle: 'false' },
          { id: 'e-n2-e2', source: 'n2', target: 'e2' },
        ],
        triggersJson: [{ id: 'tr1', eventType: 'finance.fee.overdue', conditions: {} }],
      },
      {
        slug: 'consent-reminder',
        name: 'Nhắc đồng thuận phụ huynh',
        description: 'Gửi yêu cầu đồng thuận và theo dõi phản hồi',
        category: 'safety',
        isBuiltIn: true,
        nodesJson: [
          { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 250, y: 0 }, data: {} },
          {
            id: 'n1',
            type: 'notification',
            label: 'Gửi yêu cầu',
            position: { x: 250, y: 100 },
            data: { notificationTemplate: 'consent_request', notificationChannel: 'email' },
          },
          {
            id: 'd1',
            type: 'delay',
            label: 'Chờ 3 ngày',
            position: { x: 250, y: 200 },
            data: { delayMinutes: 4320 },
          },
          {
            id: 'c1',
            type: 'condition',
            label: 'Đã nhận phản hồi?',
            position: { x: 250, y: 300 },
            data: { conditionField: 'received', conditionOperator: '==', conditionValue: 'true' },
          },
          { id: 'e1', type: 'end', label: 'Hoàn tất', position: { x: 100, y: 400 }, data: {} },
          {
            id: 'n2',
            type: 'notification',
            label: 'Nhắc lại',
            position: { x: 400, y: 400 },
            data: { notificationTemplate: 'consent_followup', notificationChannel: 'in_app' },
          },
          { id: 'e2', type: 'end', label: 'Kết thúc', position: { x: 400, y: 500 }, data: {} },
        ],
        edgesJson: [
          { id: 'e-s1-n1', source: 's1', target: 'n1' },
          { id: 'e-n1-d1', source: 'n1', target: 'd1' },
          { id: 'e-d1-c1', source: 'd1', target: 'c1' },
          { id: 'e-c1-e1', source: 'c1', target: 'e1', sourceHandle: 'true' },
          { id: 'e-c1-n2', source: 'c1', target: 'n2', sourceHandle: 'false' },
          { id: 'e-n2-e2', source: 'n2', target: 'e2' },
        ],
        triggersJson: [{ id: 'tr1', eventType: 'consent.request.created', conditions: {} }],
      },
      {
        slug: 'incident-escalation',
        name: 'Xử lý sự cố an toàn',
        description: 'Quy trình báo cáo, điều tra và xử lý sự cố an toàn',
        category: 'safety',
        isBuiltIn: true,
        nodesJson: [
          { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 250, y: 0 }, data: {} },
          {
            id: 't1',
            type: 'task',
            label: 'Báo cáo sự cố',
            position: { x: 250, y: 100 },
            data: { assigneeRole: 'member', description: 'Ghi nhận chi tiết sự cố' },
          },
          {
            id: 'n1',
            type: 'notification',
            label: 'Thông báo Admin',
            position: { x: 250, y: 200 },
            data: { notificationTemplate: 'incident_alert', notificationChannel: 'in_app' },
          },
          {
            id: 'a1',
            type: 'approval',
            label: 'Điều tra & xác minh',
            position: { x: 250, y: 300 },
            data: { assigneeRole: 'admin', description: 'Xác minh sự cố, đánh giá mức độ' },
          },
          {
            id: 't2',
            type: 'task',
            label: 'Xử lý khắc phục',
            position: { x: 250, y: 400 },
            data: { assigneeRole: 'leader' },
          },
          { id: 'e1', type: 'end', label: 'Hoàn tất', position: { x: 250, y: 500 }, data: {} },
        ],
        edgesJson: [
          { id: 'e-s1-t1', source: 's1', target: 't1' },
          { id: 'e-t1-n1', source: 't1', target: 'n1' },
          { id: 'e-n1-a1', source: 'n1', target: 'a1' },
          { id: 'e-a1-t2', source: 'a1', target: 't2' },
          { id: 'e-t2-e1', source: 't2', target: 'e1' },
        ],
        triggersJson: [{ id: 'tr1', eventType: 'incident.reported', conditions: {} }],
      },
      {
        slug: 'camp-checklist',
        name: 'Checklist tổ chức trại',
        description: 'Quy trình chuẩn bị, kiểm tra trang bị, vận chuyển và xác nhận địa điểm',
        category: 'operations',
        isBuiltIn: true,
        nodesJson: [
          { id: 's1', type: 'start', label: 'Bắt đầu', position: { x: 250, y: 0 }, data: {} },
          {
            id: 't1',
            type: 'task',
            label: 'Chuẩn bị trang bị',
            position: { x: 250, y: 100 },
            data: { assigneeRole: 'member', description: 'Kiểm tra danh sách trang bị' },
          },
          {
            id: 'a1',
            type: 'approval',
            label: 'Trưởng kiểm tra',
            position: { x: 250, y: 200 },
            data: { assigneeRole: 'leader' },
          },
          {
            id: 't2',
            type: 'task',
            label: 'Vận chuyển',
            position: { x: 250, y: 300 },
            data: { assigneeRole: 'volunteer' },
          },
          {
            id: 'a2',
            type: 'approval',
            label: 'Kiểm tra địa điểm',
            position: { x: 250, y: 400 },
            data: { assigneeRole: 'leader' },
          },
          { id: 'e1', type: 'end', label: 'Sẵn sàng', position: { x: 250, y: 500 }, data: {} },
        ],
        edgesJson: [
          { id: 'e-s1-t1', source: 's1', target: 't1' },
          { id: 'e-t1-a1', source: 't1', target: 'a1' },
          { id: 'e-a1-t2', source: 'a1', target: 't2' },
          { id: 'e-t2-a2', source: 't2', target: 'a2' },
          { id: 'e-a2-e1', source: 'a2', target: 'e1' },
        ],
        triggersJson: [],
      },
    ];
  }
}
