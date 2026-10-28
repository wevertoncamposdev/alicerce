import { CleanupJobsService } from './cleanup-jobs.service';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { ConfigService } from '@nestjs/config';

describe('CleanupJobsService (etapa 10.1 / 9.4)', () => {
  let service: CleanupJobsService;
  let prisma: {
    refreshToken: { updateMany: jest.Mock };
    accountToken: { deleteMany: jest.Mock };
    audit: {
      deleteMany: jest.Mock<
        Promise<{ count: number }>,
        [{ where: { createdAt: { lt: Date } } }]
      >;
    };
  };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    prisma = {
      refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      accountToken: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      audit: {
        deleteMany: jest
          .fn<
            Promise<{ count: number }>,
            [{ where: { createdAt: { lt: Date } } }]
          >()
          .mockResolvedValue({ count: 5 }),
      },
    };
    configService = { get: jest.fn().mockReturnValue(365) };

    service = new CleanupJobsService(
      prisma as unknown as PrismaBootstrapService,
      configService as unknown as ConfigService,
    );
  });

  it('cleanupExpiredRefreshTokens: revoga (não apaga) refresh tokens expirados e não revogados', async () => {
    const count = await service.cleanupExpiredRefreshTokens();

    expect(count).toBe(2);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        revokedAt: null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresAt: { lt: expect.any(Date) },
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('cleanupExpiredAccountTokens: apaga account tokens expirados e nunca usados', async () => {
    const count = await service.cleanupExpiredAccountTokens();

    expect(count).toBe(3);
    expect(prisma.accountToken.deleteMany).toHaveBeenCalledWith({
      where: {
        usedAt: null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresAt: { lt: expect.any(Date) },
      },
    });
  });

  it('purgeOldAuditEntries: apaga auditoria mais antiga que AUDIT_RETENTION_DAYS', async () => {
    configService.get.mockReturnValue(30);

    const count = await service.purgeOldAuditEntries();

    expect(count).toBe(5);
    expect(configService.get).toHaveBeenCalledWith('AUDIT_RETENTION_DAYS', 365);

    const [[call]] = prisma.audit.deleteMany.mock.calls;
    const cutoff = call.where.createdAt.lt;
    const expectedCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    // Tolerância de alguns ms entre o cálculo do teste e o do serviço.
    expect(Math.abs(cutoff.getTime() - expectedCutoff)).toBeLessThan(1000);
  });
});
