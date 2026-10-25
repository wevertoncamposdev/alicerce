import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '@src/app.module';
import { configureApp } from '@src/configure-app';
import { MAIL_PROVIDER } from '@core/mail/mail-provider.interface';
import { RedisService } from '@core/redis/redis.service';
import { InMemoryMailProvider } from './in-memory-mail.provider';

export interface TestApp {
  app: NestFastifyApplication;
  mail: InMemoryMailProvider;
  redis: RedisService;
  close(): Promise<void>;
}

// Sobe o AppModule inteiro (Fastify + cookies + CORS + helmet +
// ValidationPipe iguais ao main.ts, via configureApp — etapa 12.1) contra
// Postgres/Redis reais. Único override de DI: MAIL_PROVIDER, pra ler
// tokens de convite/reset/verificação sem depender de SMTP de teste nem do
// log — tudo o mais (Prisma, RLS, cache de permissão, throttler) é o
// pipeline de produção de verdade.
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MAIL_PROVIDER)
    .useClass(InMemoryMailProvider)
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const mail = moduleRef.get(MAIL_PROVIDER) as InMemoryMailProvider;
  const redis = moduleRef.get(RedisService);

  return {
    app,
    mail,
    redis,
    close: () => app.close(),
  };
}
