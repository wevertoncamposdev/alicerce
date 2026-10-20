import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AccountTokenService } from './account-token.service';
import { PrismaService } from '@core/prisma/prisma.service';

interface MockTokenRow {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  newEmail?: string | null;
}

describe('AccountTokenService', () => {
  let service: AccountTokenService;
  let rows: Map<string, MockTokenRow>;

  const tenantId = 'tenant-1';
  const userId = 'user-1';

  beforeEach(async () => {
    rows = new Map();
    let counter = 0;

    const prismaMock = {
      accountToken: {
        create: ({ data }: { data: Omit<MockTokenRow, 'id' | 'usedAt'> }) => {
          counter += 1;
          const row: MockTokenRow = {
            id: `token-${counter}`,
            usedAt: null,
            ...data,
          };
          rows.set(row.tokenHash, row);
          return Promise.resolve(row);
        },
        findUnique: ({
          where: { tokenHash },
        }: {
          where: { tokenHash: string };
        }) => Promise.resolve(rows.get(tokenHash) ?? null),
        update: ({
          where: { id },
          data,
        }: {
          where: { id: string };
          data: Partial<MockTokenRow>;
        }) => {
          const row = [...rows.values()].find((r) => r.id === id);
          if (!row) return Promise.reject(new Error('not found'));
          Object.assign(row, data);
          return Promise.resolve(row);
        },
        updateMany: ({
          where,
          data,
        }: {
          where: { userId: string; type: string; usedAt: null };
          data: Partial<MockTokenRow>;
        }) => {
          let count = 0;
          for (const row of rows.values()) {
            if (
              row.userId === where.userId &&
              row.type === where.type &&
              row.usedAt === null
            ) {
              Object.assign(row, data);
              count += 1;
            }
          }
          return Promise.resolve({ count });
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountTokenService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(AccountTokenService);
  });

  it('emite um token e consome com sucesso', async () => {
    const rawToken = await service.issue({
      userId,
      tenantId,
      type: 'VERIFY_EMAIL',
      ttlMs: 60_000,
    });

    const consumed = await service.consume(rawToken, 'VERIFY_EMAIL');
    expect(consumed.userId).toBe(userId);
  });

  it('rejeita um token expirado', async () => {
    const rawToken = await service.issue({
      userId,
      tenantId,
      type: 'RESET_PASSWORD',
      ttlMs: -1_000, // já expirado
    });

    await expect(service.consume(rawToken, 'RESET_PASSWORD')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejeita o mesmo token na segunda tentativa de uso', async () => {
    const rawToken = await service.issue({
      userId,
      tenantId,
      type: 'INVITE',
      ttlMs: 60_000,
    });

    await service.consume(rawToken, 'INVITE');

    await expect(service.consume(rawToken, 'INVITE')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejeita um token válido consumido com o tipo errado', async () => {
    const rawToken = await service.issue({
      userId,
      tenantId,
      type: 'INVITE',
      ttlMs: 60_000,
    });

    await expect(service.consume(rawToken, 'RESET_PASSWORD')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('invalidatePending marca tokens não usados do mesmo tipo como usados', async () => {
    const first = await service.issue({
      userId,
      tenantId,
      type: 'INVITE',
      ttlMs: 60_000,
    });

    await service.invalidatePending(userId, 'INVITE');

    await expect(service.consume(first, 'INVITE')).rejects.toThrow(
      BadRequestException,
    );
  });
});
