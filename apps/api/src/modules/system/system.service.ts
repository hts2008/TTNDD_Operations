import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database';

export interface ModuleStatus {
  key: string;
  active: boolean;
  ready: boolean;
  reasons: string[];
  seedCount: number;
}

export interface ModuleHealthResult {
  orgId: string;
  profile: string;
  checkedAt: string;
  modules: ModuleStatus[];
  overall: 'PASS' | 'FAIL';
  failCount: number;
}

export interface SeedHealthResult {
  orgId: string;
  counts: Record<string, number>;
  status: 'PASS' | 'NEEDS_SEED';
  missingSeeds: string[];
  checkedAt: string;
}

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async getModuleHealth(orgId: string): Promise<ModuleHealthResult> {
    const [
      memberCount, skillGroupCount, badgeCount, sessionCount,
      eventCount, courseCount, planCount, ticketCount,
      financeAccCount, assetCount, workflowCount, notifTemplateCount,
    ] = await Promise.all([
      this.prisma.orgMember.count({ where: { orgId } }),
      this.prisma.skillGroup.count({ where: { orgId } }),
      this.prisma.badgeDefinition.count({ where: { orgId } }),
      this.prisma.session.count({ where: { orgId } }),
      this.prisma.event.count({ where: { orgId } }),
      this.prisma.course.count({ where: { orgId } }),
      this.prisma.plan.count({ where: { orgId } }),
      this.prisma.ticket.count({ where: { orgId } }),
      this.prisma.financialAccount.count({ where: { orgId } }),
      this.prisma.asset.count({ where: { orgId } }),
      this.prisma.workflowDefinition.count({ where: { orgId } }),
      this.prisma.notificationTemplate.count({ where: { orgId } }),
    ]);

    const modules: ModuleStatus[] = [
      {
        key: 'HRM', active: true,
        ready: memberCount > 0,
        reasons: memberCount === 0 ? ['No members — run: pnpm db:seed or POST /data-import/members'] : [],
        seedCount: memberCount,
      },
      {
        key: 'SCOUT', active: true,
        ready: skillGroupCount > 0 && badgeCount > 0,
        reasons: [
          ...(skillGroupCount === 0 ? ['No skill groups — run seed'] : []),
          ...(badgeCount === 0 ? ['No badge definitions — run seed'] : []),
        ],
        seedCount: skillGroupCount + badgeCount,
      },
      {
        key: 'SESSIONS', active: true,
        ready: memberCount > 0,
        reasons: memberCount === 0 ? ['Needs members to create sessions'] : [],
        seedCount: sessionCount,
      },
      {
        key: 'EVENTS', active: true,
        ready: memberCount > 0,
        reasons: memberCount === 0 ? ['Needs members to register events'] : [],
        seedCount: eventCount,
      },
      {
        key: 'LMS', active: true,
        ready: courseCount > 0,
        reasons: courseCount === 0 ? ['No courses — run seed or create via API'] : [],
        seedCount: courseCount,
      },
      {
        key: 'PROJECTS', active: true,
        ready: planCount > 0 || memberCount > 0,
        reasons: [],
        seedCount: planCount,
      },
      {
        key: 'TICKETS', active: true,
        ready: memberCount > 0,
        reasons: memberCount === 0 ? ['Needs members to create tickets'] : [],
        seedCount: ticketCount,
      },
      {
        key: 'FINANCE', active: true,
        ready: financeAccCount > 0,
        reasons: financeAccCount === 0 ? ['No financial accounts — run seed'] : [],
        seedCount: financeAccCount,
      },
      {
        key: 'ASSETS', active: true,
        ready: assetCount > 0,
        reasons: assetCount === 0 ? ['No assets — run seed'] : [],
        seedCount: assetCount,
      },
      {
        key: 'PROCESS', active: true,
        ready: workflowCount > 0 || memberCount > 0,
        reasons: [],
        seedCount: workflowCount,
      },
      {
        key: 'NOTIFICATIONS', active: true,
        ready: notifTemplateCount > 0,
        reasons: notifTemplateCount === 0 ? ['No notification templates — run seed'] : [],
        seedCount: notifTemplateCount,
      },
      {
        key: 'FILE_STORAGE', active: true,
        ready: true,
        reasons: [],
        seedCount: 0,
      },
    ];

    const failedModules = modules.filter(m => m.active && !m.ready);
    return {
      orgId,
      profile: 'PROFILE_OPS',
      checkedAt: new Date().toISOString(),
      modules,
      overall: failedModules.length === 0 ? 'PASS' : 'FAIL',
      failCount: failedModules.length,
    };
  }

  async getSeedHealth(orgId: string): Promise<SeedHealthResult> {
    const [branches, units, members, skillGroups, skills, badges, sessions, events, courses, financeAccounts, assets] = await Promise.all([
      this.prisma.branch.count({ where: { orgId } }),
      this.prisma.unit.count({ where: { orgId } }),
      this.prisma.orgMember.count({ where: { orgId } }),
      this.prisma.skillGroup.count({ where: { orgId } }),
      this.prisma.skill.count({ where: { orgId } }),
      this.prisma.badgeDefinition.count({ where: { orgId } }),
      this.prisma.session.count({ where: { orgId } }),
      this.prisma.event.count({ where: { orgId } }),
      this.prisma.course.count({ where: { orgId } }),
      this.prisma.financialAccount.count({ where: { orgId } }),
      this.prisma.asset.count({ where: { orgId } }),
    ]);

    const counts = { branches, units, members, skillGroups, skills, badges, sessions, events, courses, financeAccounts, assets };
    const missingSeeds: string[] = [];

    if (branches < 3) missingSeeds.push(`Need ≥3 branches (got ${branches}) — Đồng/Thiếu/Thanh`);
    if (members < 3) missingSeeds.push(`Need ≥3 members (got ${members})`);
    if (skillGroups < 1) missingSeeds.push(`Need ≥1 skill group (got ${skillGroups})`);
    if (badges < 5) missingSeeds.push(`Need ≥5 badge definitions (got ${badges})`);
    if (courses < 1) missingSeeds.push(`Need ≥1 LMS course (got ${courses})`);
    if (financeAccounts < 1) missingSeeds.push(`Need ≥1 financial account (got ${financeAccounts})`);

    return {
      orgId,
      counts,
      status: missingSeeds.length === 0 ? 'PASS' : 'NEEDS_SEED',
      missingSeeds,
      checkedAt: new Date().toISOString(),
    };
  }

  async getApiHealth() {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch (_) { /* ignore */ }

    return {
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'connected' : 'error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      specVersion: '17.0',
    };
  }

  async getLatestReleaseGate() {
    const latest = await this.prisma.releaseGateReport.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    return latest ?? { status: 'pending', message: 'No release gate report generated yet. Run CI pipeline to generate.' };
  }

  async saveReleaseGateReport(data: {
    environment: string;
    buildId?: string;
    commitSha?: string;
    profile: string;
    status: string;
    reportJson: object;
    linksJson?: object;
  }) {
    return this.prisma.releaseGateReport.create({ data });
  }
}
