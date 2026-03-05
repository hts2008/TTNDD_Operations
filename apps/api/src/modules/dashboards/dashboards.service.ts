import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database';

export interface DashboardWidget {
  label: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'flat';
}

interface DateRangeFilter {
  from?: string;
  to?: string;
  branchId?: string;
}

@Injectable()
export class DashboardsService {
  private readonly logger = new Logger(DashboardsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Org Dashboard (cross-module summary) ──

  async getOrgDashboard(orgId: string): Promise<{ widgets: DashboardWidget[]; recentActivity: unknown[] }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalMembers,
      activeMembers,
      sessionsThisMonth,
      sessionsPrevMonth,
      attendanceThisMonth,
      totalExpAwarded,
      activeCourses,
      openTickets,
      accountBalances,
      upcomingEvents,
      recentAudit,
    ] = await Promise.all([
      this.prisma.orgMember.count({ where: { orgId } }),
      this.prisma.orgMember.count({ where: { orgId, status: 'active' } }),
      this.prisma.session.count({
        where: { orgId, sessionDate: { gte: monthStart } },
      }),
      this.prisma.session.count({
        where: { orgId, sessionDate: { gte: prevMonthStart, lt: monthStart } },
      }),
      this.prisma.sessionAttendance.findMany({
        where: { orgId, session: { sessionDate: { gte: monthStart } } },
        select: { status: true },
      }),
      this.prisma.expTransaction.aggregate({
        where: { orgId, transactionType: 'earn' },
        _sum: { expAmount: true },
      }),
      this.prisma.course.count({
        where: { orgId, status: { in: ['published', 'active'] } },
      }),
      this.prisma.ticket.count({
        where: { orgId, status: { in: ['open', 'in_progress'] } },
      }),
      this.prisma.financialAccount.aggregate({
        where: { orgId, isActive: true },
        _sum: { currentBalance: true },
      }),
      this.prisma.event.findMany({
        where: { orgId, startDate: { gte: now } },
        orderBy: { startDate: 'asc' },
        take: 5,
        select: { id: true, title: true, startDate: true, eventType: true, status: true },
      }),
      this.prisma.auditLog.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, action: true, resource: true, resourceId: true, createdAt: true, userId: true },
      }),
    ]);

    const presentCount = attendanceThisMonth.filter((a) => a.status === 'present').length;
    const totalAttendance = attendanceThisMonth.length;
    const avgAttendancePct = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    const sessionChange = sessionsPrevMonth > 0
      ? Math.round(((sessionsThisMonth - sessionsPrevMonth) / sessionsPrevMonth) * 100)
      : 0;

    const widgets: DashboardWidget[] = [
      {
        label: 'Total Members',
        value: totalMembers,
        change: activeMembers,
        trend: 'flat',
      },
      {
        label: 'Active Members',
        value: activeMembers,
        trend: 'flat',
      },
      {
        label: 'Sessions This Month',
        value: sessionsThisMonth,
        change: sessionChange,
        trend: sessionsThisMonth >= sessionsPrevMonth ? 'up' : 'down',
      },
      {
        label: 'Avg Attendance %',
        value: `${avgAttendancePct}%`,
        trend: avgAttendancePct >= 70 ? 'up' : 'down',
      },
      {
        label: 'Total EXP Awarded',
        value: totalExpAwarded._sum.expAmount ?? 0,
        trend: 'up',
      },
      {
        label: 'Active Courses',
        value: activeCourses,
        trend: 'flat',
      },
      {
        label: 'Open Tickets',
        value: openTickets,
        trend: openTickets > 10 ? 'up' : 'flat',
      },
      {
        label: 'Finance Balance (VND)',
        value: accountBalances._sum.currentBalance
          ? Number(accountBalances._sum.currentBalance)
          : 0,
        trend: 'flat',
      },
      {
        label: 'Upcoming Events',
        value: upcomingEvents.length,
        trend: 'flat',
      },
    ];

    return { widgets, recentActivity: recentAudit };
  }

  // ── SPICES Coverage Dashboard ──

  async getSpicesDashboard(orgId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { orgId },
      select: {
        id: true,
        branchId: true,
        pillarDaoDuc: true,
        pillarPhuongPhap: true,
        pillarGiaoDuc: true,
        lessonPlan: true,
      },
    });

    const pillarCounts = { daoDuc: 0, phuongPhap: 0, giaoDuc: 0 };
    const branchBreakdown: Record<string, { daoDuc: number; phuongPhap: number; giaoDuc: number; total: number }> = {};

    for (const session of sessions) {
      const branchId = session.branchId;
      if (!branchBreakdown[branchId]) {
        branchBreakdown[branchId] = { daoDuc: 0, phuongPhap: 0, giaoDuc: 0, total: 0 };
      }
      branchBreakdown[branchId].total++;

      if (session.pillarDaoDuc) {
        pillarCounts.daoDuc++;
        branchBreakdown[branchId].daoDuc++;
      }
      if (session.pillarPhuongPhap) {
        pillarCounts.phuongPhap++;
        branchBreakdown[branchId].phuongPhap++;
      }
      if (session.pillarGiaoDuc) {
        pillarCounts.giaoDuc++;
        branchBreakdown[branchId].giaoDuc++;
      }
    }

    const totalTagged = pillarCounts.daoDuc + pillarCounts.phuongPhap + pillarCounts.giaoDuc;
    const balanceScore = totalTagged > 0
      ? Math.round(
          (1 - Math.abs(pillarCounts.daoDuc - pillarCounts.phuongPhap) / totalTagged
            + Math.abs(pillarCounts.phuongPhap - pillarCounts.giaoDuc) / totalTagged
            + Math.abs(pillarCounts.giaoDuc - pillarCounts.daoDuc) / totalTagged) / 3 * 100,
        )
      : 0;

    const branches = await this.prisma.branch.findMany({
      where: { orgId },
      select: { id: true, name: true, code: true },
    });
    const branchMap = Object.fromEntries(branches.map((b) => [b.id, b]));

    const perBranch = Object.entries(branchBreakdown).map(([branchId, counts]) => ({
      branchId,
      branchName: branchMap[branchId]?.name ?? branchId,
      branchCode: branchMap[branchId]?.code ?? '',
      ...counts,
    }));

    return {
      tamTru: pillarCounts,
      totalSessions: sessions.length,
      balanceScore,
      perBranch,
    };
  }

  // ── Personal Dashboard ──

  async getMyDashboard(orgId: string, memberId: string) {
    const [
      expSummary,
      skillProgress,
      attendance,
      courseProgress,
      badges,
      upcomingSessions,
      upcomingEvents,
      recentExp,
    ] = await Promise.all([
      this.prisma.memberExpSummary.findFirst({
        where: { orgId, orgMemberId: memberId },
      }),
      this.prisma.memberSkillProgress.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { skill: { select: { name: true, maxLevel: true, skillGroupId: true } } },
      }),
      this.prisma.sessionAttendance.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { session: { select: { title: true, sessionDate: true } } },
        orderBy: { session: { sessionDate: 'desc' } },
        take: 20,
      }),
      this.prisma.memberCourseProgress.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { course: { select: { title: true, category: true } } },
      }),
      this.prisma.memberBadge.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { badge: { select: { name: true, imageUrl: true, rarity: true } } },
        orderBy: { earnedAt: 'desc' },
      }),
      this.prisma.session.findMany({
        where: { orgId, sessionDate: { gte: new Date() }, status: 'planned' },
        orderBy: { sessionDate: 'asc' },
        take: 5,
        select: { id: true, title: true, sessionDate: true, startTime: true, location: true },
      }),
      this.prisma.event.findMany({
        where: {
          orgId,
          startDate: { gte: new Date() },
          registrations: { some: { orgMemberId: memberId } },
        },
        orderBy: { startDate: 'asc' },
        take: 5,
        select: { id: true, title: true, startDate: true, location: true },
      }),
      this.prisma.expTransaction.findMany({
        where: { orgId, orgMemberId: memberId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, expAmount: true, transactionType: true, eventType: true, createdAt: true, notes: true },
      }),
    ]);

    const totalSessions = attendance.length;
    const presentSessions = attendance.filter((a) => a.status === 'present').length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

    const completedSkills = skillProgress.filter((sp) => sp.completedAt !== null).length;
    const inProgressSkills = skillProgress.filter((sp) => sp.currentLevel > 0 && !sp.completedAt).length;

    const completedCourses = courseProgress.filter((cp) => cp.status === 'completed').length;
    const inProgressCourses = courseProgress.filter((cp) => cp.status === 'in_progress').length;

    return {
      exp: {
        totalExp: expSummary?.totalExp ?? 0,
        availableExp: expSummary?.availableExp ?? 0,
      },
      skills: {
        total: skillProgress.length,
        completed: completedSkills,
        inProgress: inProgressSkills,
        details: skillProgress.map((sp) => ({
          skillName: sp.skill.name,
          currentLevel: sp.currentLevel,
          maxLevel: sp.skill.maxLevel,
          completed: !!sp.completedAt,
        })),
      },
      attendance: {
        totalSessions,
        present: presentSessions,
        rate: attendanceRate,
      },
      courses: {
        total: courseProgress.length,
        completed: completedCourses,
        inProgress: inProgressCourses,
        details: courseProgress.map((cp) => ({
          courseTitle: cp.course.title,
          category: cp.course.category,
          progressPct: cp.progressPct,
          status: cp.status,
        })),
      },
      badges: badges.map((b) => ({
        name: b.badge.name,
        imageUrl: b.badge.imageUrl,
        rarity: b.badge.rarity,
        earnedAt: b.earnedAt,
      })),
      upcoming: {
        sessions: upcomingSessions,
        events: upcomingEvents,
      },
      recentAchievements: recentExp,
    };
  }

  // ── Member Report ──

  async getMemberReport(orgId: string, memberId: string) {
    const [
      member,
      profile,
      attendance,
      skillProgress,
      ranks,
      expTransactions,
      badges,
      evaluations,
      courseProgress,
      spiritualLogs,
    ] = await Promise.all([
      this.prisma.orgMember.findFirst({
        where: { orgId, id: memberId },
        select: {
          id: true, role: true, branchId: true, unitId: true,
          memberCode: true, scoutName: true, heroName: true,
          joinedDate: true, status: true,
        },
      }),
      this.prisma.memberProfile.findFirst({
        where: { orgId, orgMemberId: memberId },
      }),
      this.prisma.sessionAttendance.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { session: { select: { title: true, sessionDate: true, branchId: true } } },
        orderBy: { session: { sessionDate: 'desc' } },
      }),
      this.prisma.memberSkillProgress.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { skill: { select: { name: true, maxLevel: true } } },
      }),
      this.prisma.memberRank.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { rank: { select: { rankName: true, rankCode: true, rankOrder: true } } },
        orderBy: { rank: { rankOrder: 'asc' } },
      }),
      this.prisma.expTransaction.findMany({
        where: { orgId, orgMemberId: memberId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.memberBadge.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { badge: { select: { name: true, imageUrl: true, rarity: true, badgeType: true } } },
      }),
      this.prisma.evaluation.findMany({
        where: { orgId, orgMemberId: memberId },
        orderBy: { evaluationDate: 'desc' },
        take: 10,
      }),
      this.prisma.memberCourseProgress.findMany({
        where: { orgId, orgMemberId: memberId },
        include: { course: { select: { title: true, category: true } } },
      }),
      this.prisma.spiritualLog.findMany({
        where: { orgId, orgMemberId: memberId },
        orderBy: { logDate: 'desc' },
        take: 30,
      }),
    ]);

    const totalSessions = attendance.length;
    const presentCount = attendance.filter((a) => a.status === 'present').length;

    return {
      profile: { ...member, ...profile },
      attendance: {
        total: totalSessions,
        present: presentCount,
        rate: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0,
        history: attendance.map((a) => ({
          sessionTitle: a.session.title,
          date: a.session.sessionDate,
          status: a.status,
        })),
      },
      skills: skillProgress.map((sp) => ({
        skillName: sp.skill.name,
        currentLevel: sp.currentLevel,
        maxLevel: sp.skill.maxLevel,
        completed: !!sp.completedAt,
      })),
      ranks: ranks.map((r) => ({
        rankName: r.rank.rankName,
        rankCode: r.rank.rankCode,
        status: r.status,
        completedAt: r.completedAt,
      })),
      expTransactions,
      badges: badges.map((b) => ({
        name: b.badge.name,
        imageUrl: b.badge.imageUrl,
        rarity: b.badge.rarity,
        type: b.badge.badgeType,
        earnedAt: b.earnedAt,
      })),
      evaluations,
      courses: courseProgress.map((cp) => ({
        courseTitle: cp.course.title,
        category: cp.course.category,
        progressPct: cp.progressPct,
        status: cp.status,
        completedAt: cp.completedAt,
      })),
      spiritualLogs: spiritualLogs.map((sl) => ({
        date: sl.logDate,
        type: sl.logType,
        durationMinutes: sl.durationMinutes,
        expEarned: sl.expEarned,
      })),
    };
  }

  // ── Finance Report ──

  async getFinanceReport(orgId: string, filters?: DateRangeFilter) {
    const where: Prisma.FinancialTransactionWhereInput = { orgId, status: 'completed' };
    if (filters?.from || filters?.to) {
      where.transactionDate = {};
      if (filters?.from) where.transactionDate.gte = new Date(filters.from);
      if (filters?.to) where.transactionDate.lte = new Date(filters.to);
    }

    const [transactions, fees, accounts] = await Promise.all([
      this.prisma.financialTransaction.findMany({ where, orderBy: { transactionDate: 'desc' } }),
      this.prisma.memberFee.findMany({ where: { orgId } }),
      this.prisma.financialAccount.findMany({
        where: { orgId, isActive: true },
        select: { id: true, name: true, currentBalance: true, accountType: true },
      }),
    ]);

    const byCategory: Record<string, { income: number; expense: number }> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    const monthlyTrends: Record<string, { income: number; expense: number }> = {};

    for (const tx of transactions) {
      const cat = tx.category ?? 'uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 };

      const amount = Number(tx.amount);
      const monthKey = `${tx.transactionDate.getFullYear()}-${String(tx.transactionDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyTrends[monthKey]) monthlyTrends[monthKey] = { income: 0, expense: 0 };

      if (tx.transactionType === 'income') {
        byCategory[cat].income += amount;
        totalIncome += amount;
        monthlyTrends[monthKey].income += amount;
      } else {
        byCategory[cat].expense += amount;
        totalExpense += amount;
        monthlyTrends[monthKey].expense += amount;
      }
    }

    const totalFeesDue = fees.reduce((sum, f) => sum + Number(f.amountDue), 0);
    const totalFeesPaid = fees.reduce((sum, f) => sum + Number(f.amountPaid), 0);
    const outstandingFees = totalFeesDue - totalFeesPaid;
    const feeCollectionRate = totalFeesDue > 0 ? Math.round((totalFeesPaid / totalFeesDue) * 100) : 0;

    return {
      totals: { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense },
      byCategory,
      monthlyTrends,
      fees: {
        totalDue: totalFeesDue,
        totalPaid: totalFeesPaid,
        outstanding: outstandingFees,
        collectionRate: feeCollectionRate,
      },
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.accountType,
        balance: Number(a.currentBalance),
      })),
    };
  }

  // ── Attendance Analytics ──

  async getAttendanceAnalytics(orgId: string, filters?: DateRangeFilter) {
    const sessionWhere: Prisma.SessionWhereInput = { orgId };
    if (filters?.from || filters?.to) {
      sessionWhere.sessionDate = {};
      if (filters?.from) sessionWhere.sessionDate.gte = new Date(filters.from);
      if (filters?.to) sessionWhere.sessionDate.lte = new Date(filters.to);
    }
    if (filters?.branchId) sessionWhere.branchId = filters.branchId;

    const sessions = await this.prisma.session.findMany({
      where: sessionWhere,
      include: {
        attendance: { select: { orgMemberId: true, status: true } },
        branch: { select: { name: true, code: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });

    const bySession = sessions.map((s) => {
      const total = s.attendance.length;
      const present = s.attendance.filter((a) => a.status === 'present').length;
      return {
        sessionId: s.id,
        title: s.title,
        date: s.sessionDate,
        branchName: s.branch.name,
        totalMembers: total,
        present,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    const branchStats: Record<string, { name: string; sessions: number; totalPresent: number; totalAttendance: number }> = {};
    for (const s of sessions) {
      const bid = s.branchId;
      if (!branchStats[bid]) {
        branchStats[bid] = { name: s.branch.name, sessions: 0, totalPresent: 0, totalAttendance: 0 };
      }
      branchStats[bid].sessions++;
      branchStats[bid].totalAttendance += s.attendance.length;
      branchStats[bid].totalPresent += s.attendance.filter((a) => a.status === 'present').length;
    }

    const byBranch = Object.entries(branchStats).map(([branchId, stats]) => ({
      branchId,
      branchName: stats.name,
      sessions: stats.sessions,
      avgRate: stats.totalAttendance > 0
        ? Math.round((stats.totalPresent / stats.totalAttendance) * 100)
        : 0,
    }));

    // Per-member attendance
    const memberMap: Record<string, { present: number; total: number }> = {};
    for (const s of sessions) {
      for (const a of s.attendance) {
        if (!memberMap[a.orgMemberId]) memberMap[a.orgMemberId] = { present: 0, total: 0 };
        memberMap[a.orgMemberId]!.total++;
        if (a.status === 'present') memberMap[a.orgMemberId]!.present++;
      }
    }

    const memberIds = Object.keys(memberMap);
    const members = memberIds.length > 0
      ? await this.prisma.orgMember.findMany({
          where: { orgId, id: { in: memberIds } },
          select: { id: true, scoutName: true, memberCode: true, branchId: true },
        })
      : [];
    const memberLookup = Object.fromEntries(members.map((m) => [m.id, m]));

    const byMember = memberIds
      .map((mid) => {
        const m = memberMap[mid]!;
        return {
          memberId: mid,
          scoutName: memberLookup[mid]?.scoutName ?? mid,
          memberCode: memberLookup[mid]?.memberCode,
          total: m.total,
          present: m.present,
          rate: m.total > 0 ? Math.round((m.present / m.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.rate - a.rate);

    const overallTotal = sessions.reduce((sum, s) => sum + s.attendance.length, 0);
    const overallPresent = sessions.reduce(
      (sum, s) => sum + s.attendance.filter((a) => a.status === 'present').length,
      0,
    );

    // Streak leaders: members sorted by consecutive present sessions (most recent)
    const streakLeaders = byMember.slice(0, 10);

    return {
      overall: {
        totalSessions: sessions.length,
        totalAttendanceRecords: overallTotal,
        totalPresent: overallPresent,
        avgRate: overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0,
      },
      bySession: bySession.slice(0, 50),
      byBranch,
      byMember: byMember.slice(0, 50),
      streakLeaders,
    };
  }

  // ── Global Search ──

  async globalSearch(orgId: string, query: string) {
    if (!query || query.trim().length < 2) return { results: [] };

    const q = `%${query.trim()}%`;

    const [members, sessions, events, courses, tickets, assets] = await Promise.all([
      this.prisma.orgMember.findMany({
        where: {
          orgId,
          OR: [
            { scoutName: { contains: query, mode: 'insensitive' } },
            { heroName: { contains: query, mode: 'insensitive' } },
            { memberCode: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, scoutName: true, heroName: true, memberCode: true, role: true },
      }),
      this.prisma.session.findMany({
        where: {
          orgId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { theme: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, title: true, sessionDate: true },
      }),
      this.prisma.event.findMany({
        where: { orgId, title: { contains: query, mode: 'insensitive' } },
        take: 10,
        select: { id: true, title: true, startDate: true, eventType: true },
      }),
      this.prisma.course.findMany({
        where: { orgId, title: { contains: query, mode: 'insensitive' } },
        take: 10,
        select: { id: true, title: true, category: true, status: true },
      }),
      this.prisma.ticket.findMany({
        where: {
          orgId,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { ticketNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, title: true, ticketNumber: true, status: true },
      }),
      this.prisma.asset.findMany({
        where: {
          orgId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { assetCode: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: { id: true, name: true, assetCode: true, status: true },
      }),
    ]);

    return {
      results: [
        ...members.map((m) => ({ type: 'member' as const, id: m.id, title: m.scoutName ?? m.memberCode, meta: m })),
        ...sessions.map((s) => ({ type: 'session' as const, id: s.id, title: s.title, meta: s })),
        ...events.map((e) => ({ type: 'event' as const, id: e.id, title: e.title, meta: e })),
        ...courses.map((c) => ({ type: 'course' as const, id: c.id, title: c.title, meta: c })),
        ...tickets.map((t) => ({ type: 'ticket' as const, id: t.id, title: t.title, meta: t })),
        ...assets.map((a) => ({ type: 'asset' as const, id: a.id, title: a.name, meta: a })),
      ],
    };
  }
}
