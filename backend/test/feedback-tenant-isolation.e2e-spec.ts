import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { RequestWithAuth } from '@core/common/types/http.types';
import { FeedbacksModule } from '@modules/feedbacks/feedbacks.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { RolesPermissionsGuard } from '@core/common/guards/roles-permissions.guard';
import { PERMISSIONS_KEY } from '@core/common/decorators/permissions.decorator';

/**
 * Cobre o pedido do Bloco B do FECHAMENTO.md: isolamento de Feedback entre
 * dois tenants, e que `feedback.manage` (mudar status) é exigido mesmo que
 * a chamada venha direto na API. Mesmo padrão de
 * `roles.attach-detach.e2e-spec.ts`: RolesPermissionsGuard é substituído por
 * um stub que povoa `request.user` (como o AuthGuard real faria a partir do
 * JWT) e aplica a checagem de permissão de verdade via Reflector, lendo as
 * permissões simuladas do header `x-user-permissions` em vez de um token.
 */
class MockPrisma {
  feedbacks = new Map<string, Record<string, unknown>>();

  feedback = {
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(this.feedbacks.get(id) ?? null),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const existing = this.feedbacks.get(id);
      if (!existing) {
        return Promise.reject(
          Object.assign(new Error('Record not found'), { code: 'P2025' }),
        );
      }
      Object.assign(existing, data);
      return Promise.resolve(existing);
    },
  };
}

describe('Feedback tenant isolation + feedback.manage (e2e with mocked Prisma)', () => {
  let app: INestApplication<App>;
  let mockPrisma: MockPrisma;
  const reflector = new Reflector();

  const tenantOwn = randomUUID();
  const tenantOther = randomUUID();
  const feedbackOwnId = randomUUID();
  const feedbackOtherId = randomUUID();

  beforeAll(async () => {
    mockPrisma = new MockPrisma();
    mockPrisma.feedbacks.set(feedbackOwnId, {
      id: feedbackOwnId,
      tenantId: tenantOwn,
      title: 'Meu feedback',
      description: 'Descrição',
      status: 'RECEIVED',
      createdById: randomUUID(),
    });
    mockPrisma.feedbacks.set(feedbackOtherId, {
      id: feedbackOtherId,
      tenantId: tenantOther,
      title: 'Feedback de outro tenant',
      description: 'Descrição',
      status: 'RECEIVED',
      createdById: randomUUID(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FeedbacksModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma as unknown as PrismaService)
      .overrideGuard(RolesPermissionsGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest<RequestWithAuth>();
          const tenantHeader = req.headers['x-tenant-id'];
          const permissionsHeader = req.headers['x-user-permissions'];
          const permissions =
            typeof permissionsHeader === 'string'
              ? permissionsHeader.split(',')
              : [
                  'feedback.create',
                  'feedback.read',
                  'feedback.update',
                  'feedback.delete',
                ];

          req.user = {
            sub: randomUUID(),
            username: 'user@example.com',
            tenantId: String(
              Array.isArray(tenantHeader) ? tenantHeader[0] : tenantHeader,
            ),
            roles: ['USER'],
            permissions,
          };

          const requiredPermissions = reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
          );
          if (
            requiredPermissions &&
            !requiredPermissions.some((p) => permissions.includes(p))
          ) {
            return false;
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /feedbacks/:id returns 200 for a feedback that belongs to the requesting tenant', async () => {
    const res = await request(app.getHttpServer())
      .get(`/feedbacks/${feedbackOwnId}`)
      .set('x-tenant-id', tenantOwn)
      .expect(200);

    expect(res.body).toMatchObject({ id: feedbackOwnId });
  });

  it('GET /feedbacks/:id returns 404 for a feedback that belongs to another tenant', async () => {
    await request(app.getHttpServer())
      .get(`/feedbacks/${feedbackOtherId}`)
      .set('x-tenant-id', tenantOwn)
      .expect(404);
  });

  it('PATCH /feedbacks/:id/status returns 403 without feedback.manage, and never changes the status', async () => {
    await request(app.getHttpServer())
      .patch(`/feedbacks/${feedbackOwnId}/status`)
      .set('x-tenant-id', tenantOwn)
      .set(
        'x-user-permissions',
        'feedback.create,feedback.read,feedback.update',
      )
      .send({ status: 'PLANNED' })
      .expect(403);

    expect(mockPrisma.feedbacks.get(feedbackOwnId)).toMatchObject({
      status: 'RECEIVED',
    });
  });

  it('PATCH /feedbacks/:id/status returns 200 and changes the status with feedback.manage', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/feedbacks/${feedbackOwnId}/status`)
      .set('x-tenant-id', tenantOwn)
      .set('x-user-permissions', 'feedback.read,feedback.manage')
      .send({ status: 'PLANNED' })
      .expect(200);

    expect(res.body).toMatchObject({ status: 'PLANNED' });
    expect(mockPrisma.feedbacks.get(feedbackOwnId)).toMatchObject({
      status: 'PLANNED',
    });
  });
});
