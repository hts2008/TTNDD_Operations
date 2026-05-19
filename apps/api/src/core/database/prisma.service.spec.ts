import { PrismaService } from './prisma.service';

describe('PrismaService.withRLS', () => {
  it('sets org, role, user, and member context before tenant-scoped work', async () => {
    const tx = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    };
    const service = Object.create(PrismaService.prototype) as PrismaService & {
      $transaction: jest.Mock;
    };
    const work = jest.fn().mockResolvedValue('ok');

    service.$transaction = jest.fn(async (callback) => callback(tx));

    const result = await service.withRLS(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      'admin',
      work,
      '00000000-0000-0000-0000-000000000003',
    );

    expect(result).toBe('ok');
    expect(tx.$executeRawUnsafe).toHaveBeenNthCalledWith(
      1,
      `SELECT set_config('app.current_org_id', $1, true)`,
      '00000000-0000-0000-0000-000000000001',
    );
    expect(tx.$executeRawUnsafe).toHaveBeenNthCalledWith(
      2,
      `SELECT set_config('app.user_role', $1, true)`,
      'admin',
    );
    expect(tx.$executeRawUnsafe).toHaveBeenNthCalledWith(
      3,
      `SELECT set_config('app.current_user_id', $1, true)`,
      '00000000-0000-0000-0000-000000000002',
    );
    expect(tx.$executeRawUnsafe).toHaveBeenNthCalledWith(
      4,
      `SELECT set_config('app.current_member_id', $1, true)`,
      '00000000-0000-0000-0000-000000000003',
    );
    expect(work).toHaveBeenCalledWith(tx);
  });
});
