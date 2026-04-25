import { PrismaClient, Prisma } from '@prisma/client';

/** T-1119: Seed data for Process/SOP module */
export async function seedProcessModule(prisma: PrismaClient, orgId: string) {
  console.log('🌱 Seeding Process/SOP module...');
  const actorId = 'system';

  const sop1 = await prisma.sopDocument.create({
    data: {
      orgId,
      title: 'Quy trình An toàn Trại',
      description: 'Hướng dẫn đảm bảo an toàn trong các hoạt động cắm trại của đơn vị',
      category: 'safety',
      tags: ['an toàn', 'trại', 'outdoor'],
      status: 'published',
      createdBy: actorId,
      versions: {
        create: {
          orgId,
          versionNo: 1,
          content: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: 'Quy trình An toàn Trại' }],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: '1. Kiểm tra địa điểm trước khi đến. 2. Chuẩn bị kit y tế. 3. Phân công trực.',
                  },
                ],
              },
            ],
          } as unknown as Prisma.InputJsonValue,
          status: 'published',
          publishedAt: new Date(),
          createdBy: actorId,
        },
      },
    },
  });

  const sop2 = await prisma.sopDocument.create({
    data: {
      orgId,
      title: 'Quy trình Tiếp nhận Đoàn sinh mới',
      description: 'Quy trình onboarding cho đoàn sinh mới gia nhập',
      category: 'onboarding',
      tags: ['onboarding', 'đoàn sinh', 'gia nhập'],
      status: 'published',
      createdBy: actorId,
      versions: {
        create: {
          orgId,
          versionNo: 1,
          content: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: 'Tiếp nhận Đoàn sinh' }],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: '1. Thu thập hồ sơ. 2. Liên hệ phụ huynh. 3. Xếp đội. 4. Cấp đồng phục.',
                  },
                ],
              },
            ],
          } as unknown as Prisma.InputJsonValue,
          status: 'published',
          publishedAt: new Date(),
          createdBy: actorId,
        },
      },
    },
  });

  await prisma.sopDocument.create({
    data: {
      orgId,
      title: 'Quy trình Xử lý Sự cố',
      description: 'Hướng dẫn xử lý các tình huống khẩn cấp, tai nạn, thời tiết xấu',
      category: 'safety',
      tags: ['sự cố', 'khẩn cấp', 'an toàn'],
      status: 'draft',
      createdBy: actorId,
      versions: {
        create: {
          orgId,
          versionNo: 1,
          content: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: 'Xử lý Sự cố' }],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Bản nháp — đang soạn thảo.' }],
              },
            ],
          } as unknown as Prisma.InputJsonValue,
          status: 'draft',
          createdBy: actorId,
        },
      },
    },
  });

  const onboardingDef = await prisma.workflowDefinition.create({
    data: {
      orgId,
      name: 'Quy trình Onboarding Đoàn sinh',
      description: 'Workflow tiếp nhận thành viên mới',
      isActive: true,
      version: 1,
      steps: [
        { name: 'Thu thập hồ sơ', type: 'task', assigneeRole: 'admin' },
        { name: 'Duyệt hồ sơ', type: 'approval', assigneeRole: 'super_admin' },
        { name: 'Gửi thông báo', type: 'notification' },
      ] as unknown as Prisma.InputJsonValue,
      nodesJson: [
        { id: 'start', type: 'start', label: 'Bắt đầu', position: { x: 100, y: 100 }, data: {} },
        {
          id: 'collect',
          type: 'task',
          label: 'Thu thập hồ sơ',
          position: { x: 300, y: 100 },
          data: { assigneeRole: 'admin' },
        },
        {
          id: 'approve',
          type: 'approval',
          label: 'Duyệt hồ sơ',
          position: { x: 500, y: 100 },
          data: { assigneeRole: 'super_admin' },
        },
        {
          id: 'notify',
          type: 'notification',
          label: 'Gửi chào mừng',
          position: { x: 700, y: 100 },
          data: { notificationTemplate: 'welcome', notificationChannel: 'in_app' },
        },
        { id: 'end', type: 'end', label: 'Hoàn tất', position: { x: 900, y: 100 }, data: {} },
      ] as unknown as Prisma.InputJsonValue,
      edgesJson: [
        { id: 'e1', source: 'start', target: 'collect' },
        { id: 'e2', source: 'collect', target: 'approve' },
        { id: 'e3', source: 'approve', target: 'notify' },
        { id: 'e4', source: 'notify', target: 'end' },
      ] as unknown as Prisma.InputJsonValue,
      triggersJson: [{ id: 't1', eventType: 'member.created' }] as unknown as Prisma.InputJsonValue,
      createdBy: actorId,
    },
  });

  await prisma.workflowDefinition.create({
    data: {
      orgId,
      name: 'Nhắc nhở Đóng phí',
      description: 'Workflow tự động nhắc phụ huynh đóng phí hàng tháng',
      isActive: true,
      version: 1,
      steps: [
        { name: 'Kiểm tra phí', type: 'task', assigneeRole: 'admin' },
        { name: 'Gửi nhắc nhở', type: 'notification' },
      ] as unknown as Prisma.InputJsonValue,
      nodesJson: [
        { id: 'start', type: 'start', label: 'Bắt đầu', position: { x: 100, y: 100 }, data: {} },
        {
          id: 'check',
          type: 'condition',
          label: 'Phí quá hạn?',
          position: { x: 300, y: 100 },
          data: { conditionField: 'feeStatus', conditionOperator: '==', conditionValue: 'overdue' },
        },
        {
          id: 'remind',
          type: 'notification',
          label: 'Gửi nhắc nhở',
          position: { x: 500, y: 50 },
          data: { notificationTemplate: 'fee_reminder', notificationChannel: 'email' },
        },
        {
          id: 'skip',
          type: 'notification',
          label: 'Ghi nhận đã đóng',
          position: { x: 500, y: 200 },
          data: { notificationTemplate: 'fee_paid_ack' },
        },
        { id: 'end', type: 'end', label: 'Hoàn tất', position: { x: 700, y: 100 }, data: {} },
      ] as unknown as Prisma.InputJsonValue,
      edgesJson: [
        { id: 'e1', source: 'start', target: 'check' },
        { id: 'e2', source: 'check', target: 'remind', sourceHandle: 'true' },
        { id: 'e3', source: 'check', target: 'skip', sourceHandle: 'false' },
        { id: 'e4', source: 'remind', target: 'end' },
        { id: 'e5', source: 'skip', target: 'end' },
      ] as unknown as Prisma.InputJsonValue,
      triggersJson: [
        { id: 't1', eventType: 'fee.check_monthly' },
      ] as unknown as Prisma.InputJsonValue,
      createdBy: actorId,
    },
  });

  console.log(`  ✅ 3 SOP documents, 2 workflow definitions seeded`);
}
