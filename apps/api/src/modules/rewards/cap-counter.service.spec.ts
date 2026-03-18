import { Test, TestingModule } from '@nestjs/testing';
import { CapCounterService } from './cap-counter.service';
import { PrismaService } from '../../core/database';

describe('CapCounterService', () => {
  let service: CapCounterService;
  let prisma: { expConfig: { findUnique: jest.Mock }; expTransaction: { count: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      expConfig: { findUnique: jest.fn() },
      expTransaction: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CapCounterService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CapCounterService);
  });

  it('should allow when no config exists (unconfigured event)', async () => {
    prisma.expConfig.findUnique.mockResolvedValue(null);
    const result = await service.canAward('org1', 'member1', 'unknown_event');
    expect(result.allowed).toBe(true);
  });

  it('should allow when under daily cap', async () => {
    prisma.expConfig.findUnique.mockResolvedValue({ maxPerDay: 5, maxPerWeek: -1 });
    prisma.expTransaction.count.mockResolvedValue(3);
    const result = await service.canAward('org1', 'member1', 'attendance');
    expect(result.allowed).toBe(true);
  });

  it('should block when at daily cap', async () => {
    prisma.expConfig.findUnique.mockResolvedValue({ maxPerDay: 3, maxPerWeek: -1 });
    prisma.expTransaction.count.mockResolvedValue(3);
    const result = await service.canAward('org1', 'member1', 'attendance');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Daily cap');
  });

  it('should block when at weekly cap', async () => {
    prisma.expConfig.findUnique.mockResolvedValue({ maxPerDay: -1, maxPerWeek: 10 });
    prisma.expTransaction.count.mockResolvedValue(10);
    const result = await service.canAward('org1', 'member1', 'attendance');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Weekly cap');
  });

  it('should allow when cap is -1 (unlimited)', async () => {
    prisma.expConfig.findUnique.mockResolvedValue({ maxPerDay: -1, maxPerWeek: -1 });
    const result = await service.canAward('org1', 'member1', 'attendance');
    expect(result.allowed).toBe(true);
    expect(prisma.expTransaction.count).not.toHaveBeenCalled();
  });
});
