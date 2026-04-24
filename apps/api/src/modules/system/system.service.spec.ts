import { Test, TestingModule } from '@nestjs/testing';
import { SystemService } from './system.service';
import { PrismaService } from '../../core/database';

describe('SystemService', () => {
  let service: SystemService;
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    prisma = {
      orgMember: { count: jest.fn().mockResolvedValue(10) },
      skillGroup: { count: jest.fn().mockResolvedValue(3) },
      badgeDefinition: { count: jest.fn().mockResolvedValue(8) },
      session: { count: jest.fn().mockResolvedValue(5) },
      event: { count: jest.fn().mockResolvedValue(2) },
      course: { count: jest.fn().mockResolvedValue(3) },
      plan: { count: jest.fn().mockResolvedValue(1) },
      ticket: { count: jest.fn().mockResolvedValue(4) },
      financialAccount: { count: jest.fn().mockResolvedValue(2) },
      asset: { count: jest.fn().mockResolvedValue(15) },
      workflowDefinition: { count: jest.fn().mockResolvedValue(1) },
      notificationTemplate: { count: jest.fn().mockResolvedValue(5) },
      branch: { count: jest.fn().mockResolvedValue(4) },
      unit: { count: jest.fn().mockResolvedValue(3) },
      skill: { count: jest.fn().mockResolvedValue(12) },
      releaseGateReport: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'rg-1', ...args.data, createdAt: new Date() }),
        ),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SystemService>(SystemService);
  });

  // ── getApiHealth ──────────────────────────────────────

  describe('getApiHealth', () => {
    it('should return ok when database is connected', async () => {
      const result = await service.getApiHealth();
      expect(result.status).toBe('ok');
      expect(result.db).toBe('connected');
      expect(result.uptime).toBeGreaterThan(0);
      expect(result.version).toBe('1.0.0');
    });

    it('should return degraded when database fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
      const result = await service.getApiHealth();
      expect(result.status).toBe('degraded');
      expect(result.db).toBe('error');
    });
  });

  // ── getModuleHealth ───────────────────────────────────

  describe('getModuleHealth', () => {
    it('should return PASS when all modules are ready', async () => {
      const result = await service.getModuleHealth('org-1');
      expect(result.overall).toBe('PASS');
      expect(result.failCount).toBe(0);
      expect(result.modules.length).toBeGreaterThanOrEqual(10);
    });

    it('should report FAIL when HRM has no members', async () => {
      prisma.orgMember.count.mockResolvedValue(0);
      const result = await service.getModuleHealth('org-1');
      expect(result.overall).toBe('FAIL');
      const hrm = result.modules.find(m => m.key === 'HRM');
      expect(hrm!.ready).toBe(false);
      expect(hrm!.reasons.length).toBeGreaterThan(0);
    });

    it('should report FAIL when SCOUT missing skill groups and badges', async () => {
      prisma.skillGroup.count.mockResolvedValue(0);
      prisma.badgeDefinition.count.mockResolvedValue(0);
      const result = await service.getModuleHealth('org-1');
      const scout = result.modules.find(m => m.key === 'SCOUT');
      expect(scout!.ready).toBe(false);
      expect(scout!.reasons).toHaveLength(2);
    });

    it('should always mark FILE_STORAGE as ready', async () => {
      const result = await service.getModuleHealth('org-1');
      const fs = result.modules.find(m => m.key === 'FILE_STORAGE');
      expect(fs!.ready).toBe(true);
    });

    it('should include profile and timestamp', async () => {
      const result = await service.getModuleHealth('org-1');
      expect(result.profile).toBe('PROFILE_OPS');
      expect(result.checkedAt).toBeDefined();
      expect(result.orgId).toBe('org-1');
    });
  });

  // ── getSeedHealth ─────────────────────────────────────

  describe('getSeedHealth', () => {
    it('should return PASS when all seeds present', async () => {
      const result = await service.getSeedHealth('org-1');
      expect(result.status).toBe('PASS');
      expect(result.missingSeeds).toHaveLength(0);
      expect(result.counts.members).toBe(10);
    });

    it('should detect missing branches', async () => {
      prisma.branch.count.mockResolvedValue(1);
      const result = await service.getSeedHealth('org-1');
      expect(result.status).toBe('NEEDS_SEED');
      expect(result.missingSeeds.some(s => s.includes('branches'))).toBe(true);
    });

    it('should detect missing badge definitions', async () => {
      prisma.badgeDefinition.count.mockResolvedValue(2);
      const result = await service.getSeedHealth('org-1');
      expect(result.status).toBe('NEEDS_SEED');
      expect(result.missingSeeds.some(s => s.includes('badge'))).toBe(true);
    });
  });

  // ── Release Gates ─────────────────────────────────────

  describe('getLatestReleaseGate', () => {
    it('should return latest report when exists', async () => {
      prisma.releaseGateReport.findFirst.mockResolvedValue({
        id: 'rg-1', environment: 'staging', status: 'pass', createdAt: new Date(),
      });
      const result = await service.getLatestReleaseGate();
      expect(result).toHaveProperty('status', 'pass');
    });

    it('should return pending message when no reports', async () => {
      const result = await service.getLatestReleaseGate();
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('message');
    });
  });

  describe('saveReleaseGateReport', () => {
    it('should create and return report', async () => {
      const input = {
        environment: 'staging',
        profile: 'PROFILE_OPS',
        status: 'pass',
        reportJson: { modules: 12, passed: 12 },
        buildId: 'build-123',
      };
      const result = await service.saveReleaseGateReport(input);
      expect(result).toHaveProperty('id', 'rg-1');
      expect(prisma.releaseGateReport.create).toHaveBeenCalledWith({ data: input });
    });
  });
});
