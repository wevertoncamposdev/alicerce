import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './../src/app.module';

describe('Network binding (e2e)', () => {
  let app: NestFastifyApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');

    // Reproduz o bootstrap real (host explícito) para evitar regressão do
    // bug de ECONNRESET causado por bind implícito em 127.0.0.1.
    await app.listen(0, '0.0.0.0');

    const address = app.getHttpServer().address();
    const port = typeof address === 'string' ? address : address?.port;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('aceita conexões via "localhost" (resolução IPv4 e IPv6)', async () => {
    const response = await fetch(`${baseUrl}/api`);
    expect(response.status).not.toBe(0);
  });
});
