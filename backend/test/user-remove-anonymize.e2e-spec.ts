import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersModule } from '@modules/user/user.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { FilesService } from '@core/files/file.service';
import { MailService } from '@core/mail/mail.service';
import { AccountTokenService } from '@core/auth/account-token.service';
import { buildUser, MockUser } from './helpers/fixtures';

/**
 * Cobre a etapa 9.3 (Plano Base.md, LGPD): excluir um usuário anonimiza em
 * vez de apagar a linha, e o e-mail original fica livre pra um cadastro
 * novo. Mesmo molde de user-tenant-isolation.e2e-spec.ts (MockPrisma +
 * RolesPermissionsGuard sempre permite — RBAC já tem cobertura própria).
 */
class MockPrisma {
  users = new Map<string, MockUser>();

  user = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(this.users.get(id) ?? null),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const existing = this.users.get(id);
      if (!existing) {
        return Promise.reject(
          Object.assign(new Error('Record not found'), { code: 'P2025' }),
        );
      }
      Object.assign(existing, data);
      return Promise.resolve(existing);
    },
    create: ({ data }: { data: Record<string, unknown> }) => {
      const email = data.email as string;
      if ([...this.users.values()].some((u) => u.email === email)) {
        return Promise.reject(
          Object.assign(new Error('Unique constraint failed'), {
            code: 'P2002',
          }),
        );
      }
      const row = buildUser({
        id: randomUUID(),
        tenantId: (data.tenant as { connect: { id: string } }).connect.id,
        email,
      });
      this.users.set(row.id, row);
      return Promise.resolve(row);
    },
  };

  userRole = { count: () => Promise.resolve(0) };
  refreshToken = { updateMany: () => Promise.resolve({ count: 0 }) };

  // UsersService.sendInviteEmail (etapa 7.4) busca o tenant pra montar o
  // e-mail de convite — não é o foco deste teste, só precisa existir.
  constructor(public tenantId: string) {}
  tenant = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(
        id === this.tenantId
          ? {
              id: this.tenantId,
              legalName: 'Instituicao Teste',
              tradeName: null,
              logoFileId: null,
            }
          : null,
      ),
  };
}

describe('Excluir usuário anonimiza em vez de apagar (e2e)', () => {
  let app: INestApplication<App>;
  let mockPrisma: MockPrisma;

  const tenantId = randomUUID();
  const targetUserId = randomUUID();
  const originalEmail = 'sera-removido@example.com';

  beforeAll(async () => {
    mockPrisma = new MockPrisma(tenantId);
    mockPrisma.users.set(
      targetUserId,
      buildUser({ id: targetUserId, tenantId, email: originalEmail }),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule, AuthorizationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma as unknown as PrismaService)
      .overrideGuard(RolesPermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(PermissionCacheService)
      .useValue({ invalidateUser: jest.fn(), invalidateUsers: jest.fn() })
      .overrideProvider(FilesService)
      .useValue({ getSignedUrlOrNull: () => Promise.resolve(null) })
      .overrideProvider(MailService)
      .useValue({ send: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(AccountTokenService)
      .useValue({
        issue: jest.fn().mockResolvedValue('raw-token'),
        consume: jest.fn(),
        invalidatePending: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('anonimiza nome/e-mail, mantém a linha e libera o e-mail pra um convite novo', async () => {
    await request(app.getHttpServer())
      .delete(`/user/${targetUserId}`)
      .set('x-tenant-id', tenantId)
      .expect(200);

    const removed = mockPrisma.users.get(targetUserId);
    expect(removed).toMatchObject({
      status: 'INACTIVE',
      email: `deleted-${targetUserId}@anon.invalid`,
    });
    expect((removed as unknown as { name: unknown }).name).toBeNull();
    expect(removed?.deletedAt).not.toBeNull();

    // Critério de aceite da etapa: o e-mail original está livre.
    const inviteRes = await request(app.getHttpServer())
      .post('/user')
      .set('x-tenant-id', tenantId)
      .send({ email: originalEmail, name: 'Pessoa Nova' })
      .expect(201);

    expect((inviteRes.body as { email: string }).email).toBe(originalEmail);
  });
});
