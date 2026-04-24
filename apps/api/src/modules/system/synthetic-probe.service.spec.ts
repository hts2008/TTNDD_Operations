import { SyntheticProbeService } from './synthetic-probe.service';

describe('SyntheticProbeService', () => {
  let service: SyntheticProbeService;
  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(() => {
    service = new SyntheticProbeService(mockPrisma as any);
    jest.clearAllMocks();
  });

  describe('probeDatabase', () => {
    it('should return healthy when DB responds fast', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ health_check: 1 }]);
      const result = await service.probeDatabase();
      expect(result.name).toBe('database');
      expect(result.status).toBe('healthy');
      expect(result.latencyMs).toBeDefined();
    });

    it('should return unhealthy when DB fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      const result = await service.probeDatabase();
      expect(result.name).toBe('database');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Connection refused');
    });
  });

  describe('probeMemory', () => {
    it('should return healthy under normal conditions', async () => {
      const result = await service.probeMemory();
      expect(result.name).toBe('memory');
      expect(['healthy', 'degraded']).toContain(result.status);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('probeDiskLatency', () => {
    it('should return healthy for serialization check', async () => {
      const result = await service.probeDiskLatency();
      expect(result.name).toBe('serialization');
      expect(result.status).toBe('healthy');
    });
  });

  describe('runAllProbes', () => {
    it('should populate lastResults with all probes', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ health_check: 1 }]);
      await service.runAllProbes();
      const results = service.getLastResults();
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.name)).toEqual(
        expect.arrayContaining(['database', 'memory', 'serialization']),
      );
    });
  });

  describe('getOverallStatus', () => {
    it('should return healthy when no results', () => {
      expect(service.getOverallStatus()).toBe('healthy');
    });

    it('should return unhealthy when DB probe fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('down'));
      await service.runAllProbes();
      expect(service.getOverallStatus()).toBe('unhealthy');
    });

    it('should return healthy when all probes pass', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ health_check: 1 }]);
      await service.runAllProbes();
      expect(service.getOverallStatus()).toBe('healthy');
    });
  });
});
