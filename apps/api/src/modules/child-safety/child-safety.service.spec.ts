import { ChildSafetyService } from './child-safety.service';

describe('ChildSafetyService retention policy', () => {
  it('redacts closed sensitive incidents older than the retention window', async () => {
    const prisma = {
      ticket: {
        findMany: jest.fn().mockResolvedValue([{ id: 'ticket-1' }]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new ChildSafetyService(
      prisma as any,
      { publish: jest.fn() } as any,
      { log: jest.fn() } as any,
    );

    const result = await service.applyRetentionPolicy('org-1');

    expect(result).toEqual({ redactedCount: 1 });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: 'org-1',
          isSensitive: true,
          status: 'closed',
          updatedAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
        select: { id: true },
      }),
    );
    expect(prisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: {
        description: '[REDACTED - retention policy applied]',
        customFields: expect.objectContaining({
          redactedAt: expect.any(String),
          evidenceUrls: [],
        }),
      },
    });
  });
});
