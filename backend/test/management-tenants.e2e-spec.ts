import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { ManagementModule } from '@modules/management/management.module';
import { PrismaModule } from '@core/prisma/prisma.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';

/**
 * Cobre a decisão 3 do ADR 0012: listar tenants com uso (contagem de
 * usuários/feedbacks) e suspender/reativar — só acessível com token de
 * platform user, nunca com um token de tenant (nem endpoint existe pra
 * aceitar um).
 */
describe('Management — tenants (e2e)', () => {
  let app: INestApplication<App>;

  const platformUser = {
    id: randomUUID(),
    email: 'owner@alicerce.dev',
    name: 'Dona da Plataforma',
    status: 'ACTIVE',
  };
  const password = 'correct-password';
  let passwordHash: string;

  const tenantA = {
    id: randomUUID(),
    legalName: 'Tenant A',
    slug: 'tenant-a',
    status: 'ACTIVE',
    createdAt: new Date(),
    _count: { users: 3, feedbacks: 5 },
  };
  const tenantB = {
    id: randomUUID(),
    legalName: 'Tenant B',
    slug: 'tenant-b',
    status: 'ACTIVE',
    createdAt: new Date(),
    _count: { users: 1, feedbacks: 0 },
  };
  const tenants = new Map<string, typeof tenantA | typeof tenantB>([
    [tenantA.id, { ...tenantA }],
    [tenantB.id, { ...tenantB }],
  ]);

  let accessToken: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(password, 4);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        ManagementModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({
        platformUser: {
          findUnique: () => Promise.resolve({ ...platformUser, passwordHash }),
        },
      })
      .overrideProvider(PrismaBootstrapService)
      .useValue({
        tenant: {
          findMany: () => Promise.resolve([...tenants.values()]),
          findUnique: ({ where: { id } }: { where: { id: string } }) =>
            Promise.resolve(tenants.get(id) ?? null),
          update: ({
            where: { id },
            data,
          }: {
            where: { id: string };
            data: { status: string };
          }) => {
            const tenant = tenants.get(id);
            if (!tenant) return Promise.resolve(null);
            tenant.status = data.status;
            return Promise.resolve(tenant);
          },
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/platform-auth/login')
      .send({ email: platformUser.email, password })
      .expect(200);
    accessToken = (login.body as { access_token: string }).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('exige token de platform user', async () => {
    await request(app.getHttpServer()).get('/management/tenants').expect(401);
  });

  it('lista tenants com contagem de usuários e feedbacks', async () => {
    const response = await request(app.getHttpServer())
      .get('/management/tenants')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as {
      id: string;
      userCount: number;
      feedbackCount: number;
    }[];

    expect(body).toHaveLength(2);
    const foundTenantA = body.find((item) => item.id === tenantA.id);
    expect(foundTenantA?.userCount).toBe(3);
    expect(foundTenantA?.feedbackCount).toBe(5);
  });

  it('suspende e reativa um tenant', async () => {
    const suspended = await request(app.getHttpServer())
      .patch(`/management/tenants/${tenantA.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(200);

    expect((suspended.body as { status: string }).status).toBe('SUSPENDED');

    const reactivated = await request(app.getHttpServer())
      .patch(`/management/tenants/${tenantA.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    expect((reactivated.body as { status: string }).status).toBe('ACTIVE');
  });

  it('404 ao tentar alterar status de tenant inexistente', async () => {
    await request(app.getHttpServer())
      .patch(`/management/tenants/${randomUUID()}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(404);
  });
});
