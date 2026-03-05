import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './core/database';

describe('AppService', () => {
  let service: AppService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            healthCheck: jest.fn().mockResolvedValue({ status: 'ok', latencyMs: 5 }),
          },
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return ok health when DB is healthy', async () => {
    const result = await service.getHealth();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('ttndd-ops-api');
    expect(result.database.status).toBe('ok');
  });

  it('should return degraded when DB fails', async () => {
    jest.spyOn(prisma, 'healthCheck').mockRejectedValue(new Error('Connection refused'));
    const result = await service.getHealth();
    expect(result.status).toBe('degraded');
  });
});
