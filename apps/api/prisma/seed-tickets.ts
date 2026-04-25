import { PrismaClient } from '@prisma/client';

/** T-1057: Seed data for Tickets module */
export async function seedTicketsModule(prisma: PrismaClient, orgId: string) {
  console.log('🌱 Seeding Tickets module...');
  const actorId = 'system';

  const tickets = [
    {
      title: 'Không thể đăng nhập hệ thống',
      category: 'Tài khoản',
      priority: 'critical',
      status: 'in_progress',
      assigneeId: actorId,
      dueDate: new Date('2026-07-15'),
    },
    {
      title: 'Yêu cầu cấp lại mật khẩu cho Đoàn sinh',
      category: 'Tài khoản',
      priority: 'medium',
      status: 'open',
      dueDate: new Date('2026-07-20'),
    },
    {
      title: 'Lỗi hiển thị bảng điểm danh',
      category: 'Kỹ thuật',
      priority: 'high',
      status: 'assigned',
      assigneeId: actorId,
      dueDate: new Date('2026-07-18'),
    },
    {
      title: 'Đề xuất thêm tính năng xuất PDF báo cáo',
      category: 'Tính năng',
      priority: 'low',
      status: 'resolved',
      resolvedAt: new Date(),
      dueDate: new Date('2026-08-01'),
    },
    {
      title: 'Báo cáo sự cố an toàn tại trại',
      category: 'An toàn',
      priority: 'critical',
      status: 'open',
      isSensitive: true,
      dueDate: new Date('2026-07-14'),
    },
  ];

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    const ticket = await prisma.ticket.create({
      data: {
        orgId,
        ticketNumber: `TK-${String(i + 1).padStart(5, '0')}`,
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: t.status,
        requesterId: actorId,
        assigneeId: t.assigneeId,
        isSensitive: t.isSensitive ?? false,
        dueDate: t.dueDate,
        resolvedAt: t.resolvedAt,
      },
    });

    await prisma.ticketStatusHistory.create({
      data: { ticketId: ticket.id, fromStatus: null, toStatus: 'open', changedBy: actorId },
    });

    if (t.status !== 'open') {
      await prisma.ticketStatusHistory.create({
        data: { ticketId: ticket.id, fromStatus: 'open', toStatus: t.status, changedBy: actorId },
      });
    }
  }

  console.log(`  ✅ ${tickets.length} tickets created (1 sensitive)`);
}
