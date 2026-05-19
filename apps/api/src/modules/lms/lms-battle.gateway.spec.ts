import { LmsBattleGateway } from './lms-battle.gateway';

describe('LmsBattleGateway', () => {
  const user = {
    userId: 'user-from-token',
    orgId: 'org-from-token',
    role: 'user',
    email: 'battle@pilot.test',
    firebaseUid: 'battle-user',
    memberId: 'member-from-token',
  };

  let lmsService: { joinBattle: jest.Mock };
  let authService: { verifyToken: jest.Mock };
  let gateway: LmsBattleGateway;
  let middleware: (socket: any, next: (error?: Error) => void) => Promise<void>;

  beforeEach(() => {
    lmsService = { joinBattle: jest.fn().mockResolvedValue({}) };
    authService = { verifyToken: jest.fn() };
    gateway = new LmsBattleGateway(lmsService as any, authService as any);
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as any;

    gateway.afterInit({
      use: jest.fn((handler) => {
        middleware = handler;
      }),
    } as any);
  });

  it('rejects sockets without auth token before connection is accepted', async () => {
    const socket = {
      handshake: { auth: {}, query: { orgId: 'spoof-org', userId: 'spoof-user' } },
      data: {},
    };
    const next = jest.fn();

    await middleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toContain('missing token');
    expect(authService.verifyToken).not.toHaveBeenCalled();
    expect(socket.data.orgId).toBeUndefined();
    expect(socket.data.userId).toBeUndefined();
  });

  it('rejects sockets with invalid auth token', async () => {
    authService.verifyToken.mockResolvedValue(null);
    const socket = { handshake: { auth: { token: 'bad-token' }, query: {} }, data: {} };
    const next = jest.fn();

    await middleware(socket, next);

    expect(authService.verifyToken).toHaveBeenCalledWith('bad-token');
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toContain('invalid token');
  });

  it('uses token-derived user context and ignores spoofed query identity', async () => {
    authService.verifyToken.mockResolvedValue(user);
    const socket = {
      handshake: {
        auth: { token: 'Bearer valid-token' },
        query: { orgId: 'spoof-org', userId: 'spoof-user' },
      },
      data: {},
      join: jest.fn(),
    };
    const next = jest.fn();

    await middleware(socket, next);
    const result = await gateway.handleJoinRoom(socket as any, { gameCode: 'ABC123' });

    expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(next).toHaveBeenCalledWith();
    expect(socket.data).toMatchObject({
      user,
      orgId: user.orgId,
      userId: user.userId,
    });
    expect(lmsService.joinBattle).toHaveBeenCalledWith(user.orgId, 'ABC123', user.userId);
    expect(lmsService.joinBattle).not.toHaveBeenCalledWith('spoof-org', 'ABC123', 'spoof-user');
    expect(socket.join).toHaveBeenCalledWith('ABC123');
    expect(result).toEqual({ success: true });
  });
});
