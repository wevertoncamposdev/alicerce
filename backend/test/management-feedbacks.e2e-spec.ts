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
 * Cobre a caixa única de feedbacks cross-tenant (decisão 3 do ADR 0012):
 * uma única chamada autenticada só como platform user vê registros de
 * 2+ tenants diferentes.
 */
describe('Management — caixa única de feedbacks (e2e)', () => {
  let app: INestApplication<App>;

  const platformUser = {
    id: randomUUID(),
    email: 'owner@alicerce.dev',
    name: 'Dona da Plataforma',
    status: 'ACTIVE',
  };
  const password = 'correct-password';
  let passwordHash: string;
  let accessToken: string;

  const tenantA = { id: randomUUID(), legalName: 'Tenant A', slug: 'tenant-a' };
  const tenantB = { id: randomUUID(), legalName: 'Tenant B', slug: 'tenant-b' };

  const feedbacks = [
    {
      id: randomUUID(),
      title: 'Feedback do Tenant A',
      description: '',
      status: 'RECEIVED',
      createdAt: new Date(),
      tenant: tenantA,
    },
    {
      id: randomUUID(),
      title: 'Feedback do Tenant B',
      description: '',
      status: 'RECEIVED',
      createdAt: new Date(),
      tenant: tenantB,
    },
  ];

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
        feedback: {
          findMany: () => Promise.resolve(feedbacks),
          count: () => Promise.resolve(feedbacks.length),
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
    await request(app.getHttpServer()).get('/management/feedbacks').expect(401);
  });

  it('retorna feedbacks de tenants diferentes numa única chamada', async () => {
    const response = await request(app.getHttpServer())
      .get('/management/feedbacks')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as {
      items: { tenant: { slug: string } }[];
      total: number;
    };

    expect(body.total).toBe(2);
    const tenantSlugs = new Set(body.items.map((item) => item.tenant.slug));
    expect(tenantSlugs).toEqual(new Set([tenantA.slug, tenantB.slug]));
  });
});
