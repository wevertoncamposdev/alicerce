import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '@core/prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;

  const prismaMock = {
    audit: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('findOne', () => {
    it('parses before/after JSON strings into objects', async () => {
      prismaMock.audit.findUnique.mockResolvedValueOnce({
        id: 'audit-1',
        tenantId: 'tenant-1',
        before: JSON.stringify({ name: 'old' }),
        after: JSON.stringify({ name: 'new' }),
      });

      const result = await service.findOne('audit-1', 'tenant-1');

      expect(result.before).toEqual({ name: 'old' });
      expect(result.after).toEqual({ name: 'new' });
    });

    it('keeps before as null when there was no previous value', async () => {
      prismaMock.audit.findUnique.mockResolvedValueOnce({
        id: 'audit-1',
        tenantId: 'tenant-1',
        before: null,
        after: JSON.stringify({ name: 'new' }),
      });

      const result = await service.findOne('audit-1', 'tenant-1');

      expect(result.before).toBeNull();
      expect(result.after).toEqual({ name: 'new' });
    });
  });

  describe('search', () => {
    it('filters by userId when provided', async () => {
      prismaMock.audit.findMany.mockResolvedValueOnce([] as never);
      prismaMock.audit.count.mockResolvedValueOnce(0);

      await service.search({ userId: 'user-1' }, 'tenant-1');

      expect(prismaMock.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // `expect.objectContaining` é tipado como `any` pelo @types/jest —
          // ver user.service.spec.ts/roles.service.spec.ts para o mesmo padrão.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
    });

    it('filters by createdAt range when from/to are provided', async () => {
      prismaMock.audit.findMany.mockResolvedValueOnce([] as never);
      prismaMock.audit.count.mockResolvedValueOnce(0);

      await service.search(
        { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.000Z' },
        'tenant-1',
      );

      expect(prismaMock.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-01-01T00:00:00.000Z'),
              lte: new Date('2026-01-31T23:59:59.000Z'),
            },
          }),
        }),
      );
    });

    it('does not add a createdAt filter when no period is given', async () => {
      prismaMock.audit.findMany.mockResolvedValueOnce([] as never);
      prismaMock.audit.count.mockResolvedValueOnce(0);

      await service.search({}, 'tenant-1');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const call = prismaMock.audit.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(call.where).not.toHaveProperty('createdAt');
    });
  });
});
