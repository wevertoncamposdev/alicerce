import * as path from 'path';
import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import request from 'supertest';
import { AuthModule } from '@core/auth/auth.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { FileModule } from '@core/files/file.module';
import { StorageModule } from '@core/storage/storage.module';
import { PrismaService } from '@core/prisma/prisma.service';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisModule } from '@core/redis/redis.module';
import { RedisService } from '@core/redis/redis.service';
import { AuditService } from '@modules/audit/audit.service';
import {
  STORAGE_PROVIDER,
  StorageProvider,
} from '@core/storage/storage-provider.interface';

interface MockFileRow {
  id: string;
  tenantId: string;
  ownerType: string;
  ownerId: string | null;
  mime: string;
  size: number;
  key: string;
  uploadedById: string;
  createdAt: Date;
  deletedAt: Date | null;
}

class MockPrismaService {
  files = new Map<string, MockFileRow>();

  file = {
    create: ({
      data,
    }: {
      data: Omit<MockFileRow, 'id' | 'createdAt' | 'deletedAt'>;
    }) => {
      const row: MockFileRow = {
        id: randomUUID(),
        createdAt: new Date(),
        deletedAt: null,
        ...data,
      };
      this.files.set(row.id, row);
      return Promise.resolve(row);
    },
    findUnique: ({ where: { id } }: { where: { id: string } }) =>
      Promise.resolve(this.files.get(id) ?? null),
    update: ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Partial<MockFileRow>;
    }) => {
      const existing = this.files.get(id);
      if (!existing) return Promise.reject(new Error('not found'));
      Object.assign(existing, data);
      return Promise.resolve(existing);
    },
  };
}

class MockStorageProvider implements StorageProvider {
  puts: Array<{ key: string; data: Buffer; contentType: string }> = [];
  deletes: string[] = [];

  put(key: string, data: Buffer, contentType: string): Promise<void> {
    this.puts.push({ key, data, contentType });
    return Promise.resolve();
  }

  getSignedUrl(key: string): Promise<string> {
    return Promise.resolve(`https://storage.example.com/${key}?signed=1`);
  }

  delete(key: string): Promise<void> {
    this.deletes.push(key);
    return Promise.resolve();
  }
}

describe('Endpoints /files (e2e)', () => {
  let app: NestFastifyApplication;
  let mockPrisma: MockPrismaService;
  let mockStorage: MockStorageProvider;
  let jwtService: JwtService;

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const userA = randomUUID();
  const userAOther = randomUUID();

  beforeAll(async () => {
    mockPrisma = new MockPrismaService();
    mockStorage = new MockStorageProvider();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisModule,
        AuthorizationModule,
        AuthModule,
        StorageModule,
        FileModule,
        I18nModule.forRoot({
          fallbackLanguage: 'pt',
          loaderOptions: { path: path.join(__dirname, '../src/i18n/') },
        }),
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(STORAGE_PROVIDER)
      .useValue(mockStorage)
      .overrideProvider(PrismaBootstrapService)
      .useValue({
        user: { findUnique: () => Promise.resolve(null) },
        refreshToken: { create: () => Promise.resolve({}) },
      })
      .overrideProvider(RedisService)
      .useValue({
        client: {
          get: () => Promise.resolve(null),
          incr: () => Promise.resolve(1),
          expire: () => Promise.resolve(1),
          del: () => Promise.resolve(1),
        },
      })
      .overrideProvider(PermissionCacheService)
      .useValue({ getFreshPermissions: () => Promise.resolve([]) })
      .overrideProvider(AuditService)
      .useValue({ register: () => Promise.resolve(undefined) })
      .compile();

    jwtService = moduleFixture.get(JwtService);

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.register(multipart);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  async function tokenFor(sub: string, tenantId: string) {
    return jwtService.signAsync({
      sub,
      username: 'user@example.com',
      tenantId,
      permissions: [],
    });
  }

  it('POST /files faz upload e grava tenantId/uploadedById do token', async () => {
    const token = await tokenFor(userA, tenantA);

    const res = await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${token}`)
      .field('ownerType', 'user.avatar')
      .attach('file', Buffer.from('fake-png-bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    const body = res.body as MockFileRow;
    expect(body).toMatchObject({
      tenantId: tenantA,
      uploadedById: userA,
      ownerType: 'user.avatar',
      mime: 'image/png',
    });
    expect(mockStorage.puts).toHaveLength(1);
    expect(mockStorage.puts[0].data.toString()).toBe('fake-png-bytes');
  });

  it('rejeita um tipo de arquivo fora da whitelist', async () => {
    const token = await tokenFor(userA, tenantA);

    await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('conteudo'), {
        filename: 'arquivo.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('GET /files/:id/url devolve a URL assinada do provider', async () => {
    const token = await tokenFor(userA, tenantA);

    const upload = await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-png-bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    const fileId = (upload.body as MockFileRow).id;

    const res = await request(app.getHttpServer())
      .get(`/files/${fileId}/url`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((res.body as { url: string }).url).toContain('signed=1');
  });

  it('isolamento: usuário de outro tenant não acessa a URL de um arquivo que não é dele', async () => {
    const tokenA = await tokenFor(userA, tenantA);
    const tokenB = await tokenFor(randomUUID(), tenantB);

    const upload = await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('fake-png-bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    const fileId = (upload.body as MockFileRow).id;

    await request(app.getHttpServer())
      .get(`/files/${fileId}/url`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);
  });

  it('DELETE /files/:id só funciona pra quem enviou o arquivo', async () => {
    const token = await tokenFor(userA, tenantA);
    const otherToken = await tokenFor(userAOther, tenantA);

    const upload = await request(app.getHttpServer())
      .post('/files')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-png-bytes'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    const fileId = (upload.body as MockFileRow).id;

    await request(app.getHttpServer())
      .delete(`/files/${fileId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(mockStorage.deletes).toContain(mockPrisma.files.get(fileId)?.key);
  });
});
