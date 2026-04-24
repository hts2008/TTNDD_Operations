import { Test, TestingModule } from '@nestjs/testing';
import { DashboardsService } from './dashboards.service';
import { PrismaService } from '../../core/database';

describe('DashboardsService', () => {
  let service: DashboardsService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    prisma = {
      orgMember: {
        count: jest.fn().mockResolvedValue(25),
        findMany: jest.fn().mockResolvedValue([
          { id: 'm-1', scoutName: 'Đoàn A', heroName: 'Eagle', memberCode: 'M001', role: 'scout', branchId: 'b-1' },
        ]),
      },
      session: {
        count: jest.fn().mockResolvedValue(8),
        findMany: jest.fn().mockResolvedValue([]),
      },
      sessionAttendance: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'present' },
          { status: 'present' },
          { status: 'absent' },
        ]),
      },
      expTransaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { expAmount: 1500 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      course: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ticket: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn().mockResolvedValue([]),
      },
      financialAccount: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { currentBalance: 5000000 } }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'fa-1', name: 'Main', currentBalance: 5000000, accountType: 'operating' },
        ]),
      },
      event: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'e-1', title: 'Trại Xuân', startDate: new Date('2026-06-01'), eventType: 'camp', status: 'planned' },
        ]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'al-1', action: 'CREATE', resource: 'OrgMember', resourceId: 'm-1', createdAt: new Date(), userId: 'u-1' },
        ]),
      },
      branch: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'b-1', name: 'Thiếu Nam', code: 'TN' },
          { id: 'b-2', name: 'Ấu Nam', code: 'AN' },
        ]),
      },
      memberExpSummary: {
        findFirst: jest.fn().mockResolvedValue({ totalExp: 500, availableExp: 200 }),
      },
      memberSkillProgress: {
        findMany: jest.fn().mockResolvedValue([
          { currentLevel: 2, completedAt: new Date(), skill: { name: 'Nút Dây', maxLevel: 3, skillGroupId: 'sg-1' }, orgId: 'org-1', orgMemberId: 'm-1' },
          { currentLevel: 1, completedAt: null, skill: { name: 'Sơ Cứu', maxLevel: 3, skillGroupId: 'sg-1' }, orgId: 'org-1', orgMemberId: 'm-1' },
        ]),
      },
      memberCourseProgress: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'completed', progressPct: 100, completedAt: new Date(), course: { title: 'Kỹ năng sống', category: 'life' } },
          { status: 'in_progress', progressPct: 40, completedAt: null, course: { title: 'Lãnh đạo', category: 'leadership' } },
        ]),
      },
      memberBadge: {
        findMany: jest.fn().mockResolvedValue([
          { earnedAt: new Date(), badge: { name: 'First Aid', imageUrl: '/badges/fa.png', rarity: 'common', badgeType: 'skill' } },
        ]),
      },
      evaluation: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      memberRank: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'completed', completedAt: new Date(), rank: { rankName: 'Tân Binh', rankCode: 'TB', rankOrder: 1 } },
        ]),
      },
      spiritualLog: {
        findMany: jest.fn().mockResolvedValue([
          { logDate: new Date(), logType: 'meditation', durationMinutes: 15, expEarned: 10 },
        ]),
      },
      financialTransaction: {
        findMany: jest.fn().mockResolvedValue([
          { amount: 500000, transactionType: 'income', category: 'fees', transactionDate: new Date('2026-03-15'), status: 'completed' },
          { amount: 200000, transactionType: 'expense', category: 'supplies', transactionDate: new Date('2026-03-20'), status: 'completed' },
        ]),
      },
      memberFee: {
        findMany: jest.fn().mockResolvedValue([
          { amountDue: 200000, amountPaid: 200000 },
          { amountDue: 200000, amountPaid: 100000 },
        ]),
      },
      skillGroup: { count: jest.fn().mockResolvedValue(3) },
      badgeDefinition: { count: jest.fn().mockResolvedValue(10) },
      plan: { count: jest.fn().mockResolvedValue(2) },
      workflowDefinition: { count: jest.fn().mockResolvedValue(1) },
      notificationTemplate: { count: jest.fn().mockResolvedValue(5) },
      asset: {
        count: jest.fn().mockResolvedValue(15),
        findMany: jest.fn().mockResolvedValue([]),
      },
      unit: { count: jest.fn().mockResolvedValue(4) },
      skill: { count: jest.fn().mockResolvedValue(12) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardsService>(DashboardsService);
  });

  // ── Org Dashboard ──────────────────────────────────────

  describe('getOrgDashboard', () => {
    it('should return widgets with correct labels', async () => {
      const result = await service.getOrgDashboard('org-1');
      expect(result.widgets).toBeDefined();
      expect(result.widgets.length).toBeGreaterThanOrEqual(8);
      const labels = result.widgets.map(w => w.label);
      expect(labels).toContain('Total Members');
      expect(labels).toContain('Active Members');
      expect(labels).toContain('Sessions This Month');
    });

    it('should compute attendance percentage', async () => {
      const result = await service.getOrgDashboard('org-1');
      const attWidget = result.widgets.find(w => w.label === 'Avg Attendance %');
      expect(attWidget).toBeDefined();
      expect(attWidget!.value).toBe('67%');
    });

    it('should include recent activity from audit log', async () => {
      const result = await service.getOrgDashboard('org-1');
      expect(result.recentActivity).toHaveLength(1);
      expect(result.recentActivity[0]).toHaveProperty('action', 'CREATE');
    });

    it('should handle zero sessions gracefully', async () => {
      prisma.session.count.mockResolvedValue(0);
      prisma.sessionAttendance.findMany.mockResolvedValue([]);
      const result = await service.getOrgDashboard('org-1');
      const attWidget = result.widgets.find(w => w.label === 'Avg Attendance %');
      expect(attWidget!.value).toBe('0%');
    });
  });

  // ── SPICES Dashboard ───────────────────────────────────

  describe('getSpicesDashboard', () => {
    it('should aggregate pillar counts', async () => {
      prisma.session.findMany.mockResolvedValue([
        { id: 's-1', branchId: 'b-1', pillarDaoDuc: true, pillarPhuongPhap: false, pillarGiaoDuc: true, lessonPlan: null },
        { id: 's-2', branchId: 'b-1', pillarDaoDuc: false, pillarPhuongPhap: true, pillarGiaoDuc: false, lessonPlan: null },
        { id: 's-3', branchId: 'b-2', pillarDaoDuc: true, pillarPhuongPhap: true, pillarGiaoDuc: true, lessonPlan: null },
      ]);

      const result = await service.getSpicesDashboard('org-1');
      expect(result.tamTru.daoDuc).toBe(2);
      expect(result.tamTru.phuongPhap).toBe(2);
      expect(result.tamTru.giaoDuc).toBe(2);
      expect(result.totalSessions).toBe(3);
    });

    it('should compute per-branch breakdown', async () => {
      prisma.session.findMany.mockResolvedValue([
        { id: 's-1', branchId: 'b-1', pillarDaoDuc: true, pillarPhuongPhap: false, pillarGiaoDuc: false, lessonPlan: null },
        { id: 's-2', branchId: 'b-1', pillarDaoDuc: false, pillarPhuongPhap: true, pillarGiaoDuc: false, lessonPlan: null },
      ]);

      const result = await service.getSpicesDashboard('org-1');
      expect(result.perBranch).toHaveLength(1);
      expect(result.perBranch[0].branchName).toBe('Thiếu Nam');
      expect(result.perBranch[0].total).toBe(2);
    });

    it('should return zero balance when no sessions', async () => {
      prisma.session.findMany.mockResolvedValue([]);
      const result = await service.getSpicesDashboard('org-1');
      expect(result.balanceScore).toBe(0);
      expect(result.totalSessions).toBe(0);
    });
  });

  // ── Personal Dashboard ─────────────────────────────────

  describe('getMyDashboard', () => {
    it('should return complete personal dashboard', async () => {
      const result = await service.getMyDashboard('org-1', 'm-1');
      expect(result.exp).toEqual({ totalExp: 500, availableExp: 200 });
      expect(result.skills.total).toBe(2);
      expect(result.skills.completed).toBe(1);
      expect(result.skills.inProgress).toBe(1);
    });

    it('should compute attendance rate from records', async () => {
      prisma.sessionAttendance.findMany.mockResolvedValue([
        { status: 'present', session: { title: 'S1', sessionDate: new Date() } },
        { status: 'present', session: { title: 'S2', sessionDate: new Date() } },
        { status: 'absent', session: { title: 'S3', sessionDate: new Date() } },
        { status: 'absent', session: { title: 'S4', sessionDate: new Date() } },
      ]);
      const result = await service.getMyDashboard('org-1', 'm-1');
      expect(result.attendance.rate).toBe(50);
      expect(result.attendance.present).toBe(2);
      expect(result.attendance.totalSessions).toBe(4);
    });

    it('should map course progress correctly', async () => {
      const result = await service.getMyDashboard('org-1', 'm-1');
      expect(result.courses.completed).toBe(1);
      expect(result.courses.inProgress).toBe(1);
      expect(result.courses.details[0].courseTitle).toBe('Kỹ năng sống');
    });

    it('should handle empty exp summary', async () => {
      prisma.memberExpSummary.findFirst.mockResolvedValue(null);
      const result = await service.getMyDashboard('org-1', 'm-1');
      expect(result.exp).toEqual({ totalExp: 0, availableExp: 0 });
    });
  });

  // ── Member Report ──────────────────────────────────────

  describe('getMemberReport', () => {
    it('should return comprehensive member report', async () => {
      prisma.orgMember.findFirst = jest.fn().mockResolvedValue({
        id: 'm-1', role: 'scout', branchId: 'b-1', unitId: 'u-1',
        memberCode: 'M001', scoutName: 'Đoàn A', heroName: 'Eagle',
        joinedDate: new Date(), status: 'active',
      });
      prisma.memberProfile = { findFirst: jest.fn().mockResolvedValue({ fullName: 'Nguyễn A' }) };
      prisma.sessionAttendance.findMany.mockResolvedValue([
        { status: 'present', session: { title: 'S1', sessionDate: new Date(), branchId: 'b-1' } },
        { status: 'absent', session: { title: 'S2', sessionDate: new Date(), branchId: 'b-1' } },
      ]);

      const result = await service.getMemberReport('org-1', 'm-1');
      expect(result.profile).toBeDefined();
      expect(result.attendance.total).toBe(2);
      expect(result.attendance.rate).toBe(50);
      expect(result.skills).toHaveLength(2);
      expect(result.ranks).toHaveLength(1);
    });

    it('should handle member with no attendance', async () => {
      prisma.orgMember.findFirst = jest.fn().mockResolvedValue({ id: 'm-1' });
      prisma.memberProfile = { findFirst: jest.fn().mockResolvedValue(null) };
      prisma.sessionAttendance.findMany.mockResolvedValue([]);
      prisma.memberSkillProgress.findMany.mockResolvedValue([]);
      prisma.memberRank.findMany.mockResolvedValue([]);
      prisma.expTransaction.findMany.mockResolvedValue([]);
      prisma.memberBadge.findMany.mockResolvedValue([]);
      prisma.evaluation.findMany.mockResolvedValue([]);
      prisma.memberCourseProgress.findMany.mockResolvedValue([]);
      prisma.spiritualLog.findMany.mockResolvedValue([]);

      const result = await service.getMemberReport('org-1', 'm-1');
      expect(result.attendance.rate).toBe(0);
      expect(result.skills).toHaveLength(0);
    });

    it('should map spiritual logs', async () => {
      prisma.orgMember.findFirst = jest.fn().mockResolvedValue({ id: 'm-1' });
      prisma.memberProfile = { findFirst: jest.fn().mockResolvedValue(null) };
      prisma.sessionAttendance.findMany.mockResolvedValue([]);

      const result = await service.getMemberReport('org-1', 'm-1');
      expect(result.spiritualLogs).toHaveLength(1);
      expect(result.spiritualLogs[0]).toHaveProperty('type', 'meditation');
    });
  });

  // ── Finance Report ─────────────────────────────────────

  describe('getFinanceReport', () => {
    it('should compute income and expense totals', async () => {
      const result = await service.getFinanceReport('org-1');
      expect(result.totals.income).toBe(500000);
      expect(result.totals.expense).toBe(200000);
      expect(result.totals.net).toBe(300000);
    });

    it('should categorize transactions', async () => {
      const result = await service.getFinanceReport('org-1');
      expect(result.byCategory).toHaveProperty('fees');
      expect(result.byCategory).toHaveProperty('supplies');
      expect(result.byCategory.fees.income).toBe(500000);
    });

    it('should compute fee collection rate', async () => {
      const result = await service.getFinanceReport('org-1');
      expect(result.fees.totalDue).toBe(400000);
      expect(result.fees.totalPaid).toBe(300000);
      expect(result.fees.outstanding).toBe(100000);
      expect(result.fees.collectionRate).toBe(75);
    });

    it('should apply date range filters', async () => {
      await service.getFinanceReport('org-1', { from: '2026-01-01', to: '2026-03-31' });
      const call = prisma.financialTransaction.findMany.mock.calls[0][0];
      expect(call.where.transactionDate).toBeDefined();
      expect(call.where.transactionDate.gte).toBeInstanceOf(Date);
      expect(call.where.transactionDate.lte).toBeInstanceOf(Date);
    });

    it('should handle empty transactions', async () => {
      prisma.financialTransaction.findMany.mockResolvedValue([]);
      prisma.memberFee.findMany.mockResolvedValue([]);
      const result = await service.getFinanceReport('org-1');
      expect(result.totals.income).toBe(0);
      expect(result.totals.expense).toBe(0);
      expect(result.fees.collectionRate).toBe(0);
    });
  });

  // ── Attendance Analytics ───────────────────────────────

  describe('getAttendanceAnalytics', () => {
    const mockSessions = [
      {
        id: 's-1', title: 'Sinh hoạt 1', sessionDate: new Date('2026-03-01'),
        branchId: 'b-1', branch: { name: 'Thiếu Nam', code: 'TN' },
        attendance: [
          { orgMemberId: 'm-1', status: 'present' },
          { orgMemberId: 'm-2', status: 'present' },
          { orgMemberId: 'm-3', status: 'absent' },
        ],
      },
      {
        id: 's-2', title: 'Sinh hoạt 2', sessionDate: new Date('2026-03-08'),
        branchId: 'b-1', branch: { name: 'Thiếu Nam', code: 'TN' },
        attendance: [
          { orgMemberId: 'm-1', status: 'present' },
          { orgMemberId: 'm-2', status: 'absent' },
        ],
      },
    ];

    beforeEach(() => {
      prisma.session.findMany.mockResolvedValue(mockSessions);
    });

    it('should return overall attendance rate', async () => {
      const result = await service.getAttendanceAnalytics('org-1');
      expect(result.overall.totalSessions).toBe(2);
      expect(result.overall.totalAttendanceRecords).toBe(5);
      expect(result.overall.totalPresent).toBe(3);
      expect(result.overall.avgRate).toBe(60);
    });

    it('should compute per-session breakdown', async () => {
      const result = await service.getAttendanceAnalytics('org-1');
      expect(result.bySession).toHaveLength(2);
      expect(result.bySession[0].rate).toBe(67);
      expect(result.bySession[1].rate).toBe(50);
    });

    it('should aggregate per-branch stats', async () => {
      const result = await service.getAttendanceAnalytics('org-1');
      expect(result.byBranch).toHaveLength(1);
      expect(result.byBranch[0].branchName).toBe('Thiếu Nam');
      expect(result.byBranch[0].sessions).toBe(2);
    });

    it('should rank per-member attendance', async () => {
      const result = await service.getAttendanceAnalytics('org-1');
      expect(result.byMember.length).toBeGreaterThanOrEqual(2);
      expect(result.byMember[0].rate).toBeGreaterThanOrEqual(result.byMember[1].rate);
    });

    it('should apply branch filter', async () => {
      await service.getAttendanceAnalytics('org-1', { branchId: 'b-1' });
      const call = prisma.session.findMany.mock.calls[0][0];
      expect(call.where.branchId).toBe('b-1');
    });
  });

  // ── Global Search ──────────────────────────────────────

  describe('globalSearch', () => {
    it('should return results across 6 entity types', async () => {
      prisma.session.findMany.mockResolvedValue([{ id: 's-1', title: 'Test Session', sessionDate: new Date() }]);
      prisma.event.findMany.mockResolvedValue([{ id: 'e-1', title: 'Test Event', startDate: new Date(), eventType: 'camp' }]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.ticket.findMany.mockResolvedValue([]);
      prisma.asset.findMany.mockResolvedValue([]);

      const result = await service.globalSearch('org-1', 'Test');
      expect(result.results.length).toBeGreaterThanOrEqual(2);
      const types = result.results.map(r => r.type);
      expect(types).toContain('member');
      expect(types).toContain('session');
    });

    it('should return empty for short query', async () => {
      const result = await service.globalSearch('org-1', 'A');
      expect(result.results).toEqual([]);
    });

    it('should return empty for empty query', async () => {
      const result = await service.globalSearch('org-1', '');
      expect(result.results).toEqual([]);
    });

    it('should tag results with correct type', async () => {
      prisma.session.findMany.mockResolvedValue([]);
      prisma.event.findMany.mockResolvedValue([]);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.ticket.findMany.mockResolvedValue([{ id: 't-1', title: 'Bug', ticketNumber: 'TK001', status: 'open' }]);
      prisma.asset.findMany.mockResolvedValue([{ id: 'a-1', name: 'Tent', assetCode: 'AST001', status: 'available' }]);

      const result = await service.globalSearch('org-1', 'test');
      const ticketResult = result.results.find(r => r.type === 'ticket');
      const assetResult = result.results.find(r => r.type === 'asset');
      if (ticketResult) expect(ticketResult.title).toBe('Bug');
      if (assetResult) expect(assetResult.title).toBe('Tent');
    });
  });
});
