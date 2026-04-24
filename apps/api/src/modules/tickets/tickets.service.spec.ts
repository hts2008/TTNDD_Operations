import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../core/database';
import { DomainEventService } from '../../core/events';
import { AuditService } from '../../core/audit';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let domainEvents: { publish: jest.Mock };
  let audit: { log: jest.Mock };

  const ORG_ID = 'org-test-1';
  const USER_ID = 'user-test-1';

  beforeEach(async () => {
    prisma = {
      ticket: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      ticketComment: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      ticketStatusHistory: {
        create: jest.fn(),
      },
    };

    domainEvents = { publish: jest.fn().mockResolvedValue(undefined) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: DomainEventService, useValue: domainEvents },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  // ── Ticket CRUD ──

  describe('createTicket', () => {
    it('should create ticket with auto-generated number', async () => {
      prisma.ticket.count.mockResolvedValue(5);
      prisma.ticket.create.mockResolvedValue({
        id: 'tk-1', orgId: ORG_ID, ticketNumber: 'TK-00006',
        title: 'Sự cố sân chơi', status: 'open',
      });

      const result = await service.createTicket(ORG_ID, {
        title: 'Sự cố sân chơi', requesterId: USER_ID, priority: 'high',
      }, USER_ID);

      expect(result.ticketNumber).toBe('TK-00006');
      expect(prisma.ticketStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ fromStatus: null, toStatus: 'open' }),
      });
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'ticket.ticket_created' }),
      );
    });

    it('should support anonymous and sensitive tickets', async () => {
      prisma.ticket.count.mockResolvedValue(0);
      prisma.ticket.create.mockResolvedValue({
        id: 'tk-2', isSensitive: true, isAnonymous: true,
      });

      await service.createTicket(ORG_ID, {
        title: 'Báo cáo nhạy cảm', requesterId: USER_ID,
        isSensitive: true, isAnonymous: true,
      }, USER_ID);

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isSensitive: true, isAnonymous: true }),
      });
    });
  });

  describe('findTickets', () => {
    it('should paginate and filter by status', async () => {
      prisma.ticket.findMany.mockResolvedValue([]);
      prisma.ticket.count.mockResolvedValue(25);

      const result = await service.findTickets(ORG_ID, { status: 'open' }, 2, 10);

      expect(result.meta).toEqual({ total: 25, page: 2, limit: 10 });
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'open' }),
          skip: 10, take: 10,
        }),
      );
    });

    it('should filter by sensitive flag', async () => {
      prisma.ticket.findMany.mockResolvedValue([]);
      prisma.ticket.count.mockResolvedValue(0);

      await service.findTickets(ORG_ID, { isSensitive: true });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isSensitive: true }),
        }),
      );
    });
  });

  // ── SM-5: Ticket Lifecycle ──

  describe('transitionTicket (SM-5)', () => {
    const mockTicket = (status: string) => ({
      id: 'tk-1', orgId: ORG_ID, status, ticketNumber: 'TK-00001',
      comments: [], statusHistory: [],
    });

    it('should assign an open ticket', async () => {
      prisma.ticket.findFirst.mockResolvedValue(mockTicket('open'));
      prisma.ticket.update.mockResolvedValue({ ...mockTicket('assigned'), status: 'assigned' });

      const result = await service.transitionTicket(
        ORG_ID, 'tk-1', 'assign', USER_ID, { assigneeId: 'assignee-1' },
      );

      expect(result.status).toBe('assigned');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'tk-1' },
        data: expect.objectContaining({ status: 'assigned', assigneeId: 'assignee-1' }),
      });
      expect(domainEvents.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'ticket.ticket_assigned' }),
      );
    });

    it('should resolve an in-progress ticket', async () => {
      prisma.ticket.findFirst.mockResolvedValue(mockTicket('in_progress'));
      prisma.ticket.update.mockResolvedValue({ ...mockTicket('resolved'), status: 'resolved' });

      const result = await service.transitionTicket(ORG_ID, 'tk-1', 'resolve', USER_ID);

      expect(result.status).toBe('resolved');
      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'tk-1' },
        data: expect.objectContaining({ resolvedAt: expect.any(Date) }),
      });
    });

    it('should reopen a closed ticket', async () => {
      prisma.ticket.findFirst.mockResolvedValue(mockTicket('closed'));
      prisma.ticket.update.mockResolvedValue({ ...mockTicket('open'), status: 'open' });

      const result = await service.transitionTicket(ORG_ID, 'tk-1', 'reopen', USER_ID);
      expect(result.status).toBe('open');
    });

    it('should reject invalid transition', async () => {
      prisma.ticket.findFirst.mockResolvedValue(mockTicket('open'));

      await expect(
        service.transitionTicket(ORG_ID, 'tk-1', 'resolve', USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record status history for every transition', async () => {
      prisma.ticket.findFirst.mockResolvedValue(mockTicket('open'));
      prisma.ticket.update.mockResolvedValue({ status: 'assigned' });

      await service.transitionTicket(ORG_ID, 'tk-1', 'assign', USER_ID, { assigneeId: 'a-1' });

      expect(prisma.ticketStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketId: 'tk-1', fromStatus: 'open', toStatus: 'assigned',
        }),
      });
    });
  });

  // ── Comments ──

  describe('addComment', () => {
    it('should add a comment to ticket', async () => {
      prisma.ticket.findFirst.mockResolvedValue({
        id: 'tk-1', orgId: ORG_ID, comments: [], statusHistory: [],
      });
      prisma.ticketComment.create.mockResolvedValue({
        id: 'c-1', content: 'Đã xử lý xong', isInternal: false,
      });

      const result = await service.addComment(ORG_ID, 'tk-1', {
        content: 'Đã xử lý xong',
      }, USER_ID);

      expect(result.content).toBe('Đã xử lý xong');
      expect(prisma.ticketComment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: ORG_ID, ticketId: 'tk-1', authorId: USER_ID,
        }),
      });
    });

    it('should support internal comments', async () => {
      prisma.ticket.findFirst.mockResolvedValue({
        id: 'tk-1', orgId: ORG_ID, comments: [], statusHistory: [],
      });
      prisma.ticketComment.create.mockResolvedValue({ id: 'c-2', isInternal: true });

      await service.addComment(ORG_ID, 'tk-1', {
        content: 'Ghi chú nội bộ', isInternal: true,
      }, USER_ID);

      expect(prisma.ticketComment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isInternal: true }),
      });
    });
  });
});
