import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { LocalStorageController } from '@modules/file/local-storage.controller';
import { signLocalKey } from '@core/storage/local-signed-url.util';

/**
 * Cobre a etapa 6.2 do Plano Base.md: "download por URL assinada" também
 * no driver local (ver ADR 0010). Exercita só `LocalStorageController` —
 * é `@Public()` e não depende de Prisma/Auth, então sobe sozinho, sem
 * mocks do resto da app.
 */
describe('GET /storage/local/:key (e2e)', () => {
  let app: NestFastifyApplication;
  let tmpDir: string;
  const originalEnv = process.env;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alicerce-storage-'));
    process.env = {
      ...originalEnv,
      COOKIE_SECRET: 'test-secret-para-assinatura-local',
      STORAGE_LOCAL_PATH: tmpDir,
    };

    fs.writeFileSync(
      path.join(tmpDir, 'photo.png'),
      Buffer.from('fake-png-bytes'),
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LocalStorageController],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env = originalEnv;
  });

  it('devolve os bytes certos com uma assinatura válida', async () => {
    const { exp, sig } = signLocalKey('photo.png', 3600);

    const res = await request(app.getHttpServer())
      .get(`/storage/local/photo.png?exp=${exp}&sig=${sig}`)
      .expect(200);

    expect(res.body).toEqual(Buffer.from('fake-png-bytes'));
    expect(res.headers['content-type']).toBe('image/png');
  });

  it('rejeita uma assinatura expirada', async () => {
    const { sig } = signLocalKey('photo.png', -10);
    const expiredExp = Date.now() - 5000;

    await request(app.getHttpServer())
      .get(`/storage/local/photo.png?exp=${expiredExp}&sig=${sig}`)
      .expect(403);
  });

  it('rejeita uma assinatura inválida', async () => {
    await request(app.getHttpServer())
      .get(
        `/storage/local/photo.png?exp=${Date.now() + 60_000}&sig=sig-invalida`,
      )
      .expect(403);
  });

  it('retorna 404 para uma key que não existe no disco', async () => {
    const { exp, sig } = signLocalKey('nao-existe.png', 3600);

    await request(app.getHttpServer())
      .get(`/storage/local/nao-existe.png?exp=${exp}&sig=${sig}`)
      .expect(404);
  });
});
