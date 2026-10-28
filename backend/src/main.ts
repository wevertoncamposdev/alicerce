import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true, // necessário atrás de proxy/load balancer (Render, etc)
      // Logger NATIVO do Fastify (ele já usa pino por baixo) — não o pacote
      // `nestjs-pino`/`pino-http`: esse roda como middleware Express-style
      // (via @fastify/middie) sobre um objeto "raw" diferente do
      // FastifyRequest que guards/interceptors/filters recebem via
      // `context.switchToHttp().getRequest()` — então `request.log`, visto
      // DAQUI, continuava sendo o logger NOOP nativo do Fastify, nunca pino
      // de verdade (confirmado rodando o servidor antes de trocar de
      // abordagem). Habilitando o logger nativo do próprio Fastify,
      // `request.log`/`request.id` passam a ser reais em qualquer lugar que
      // receba o FastifyRequest, sem depender de middleware adicional.
      logger: {
        level: isProduction ? 'info' : 'debug',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
        transport: isProduction
          ? undefined
          : { target: 'pino-pretty', options: { singleLine: true } },
      },
      // O log automático de "incoming request"/"request completed" do
      // Fastify ficaria duplicado com o LoggingInterceptor (que já loga cada
      // requisição no formato do projeto, incluindo duração e referer).
      disableRequestLogging: true,
    }),
  );

  await configureApp(app);

  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Documentação só em ambientes não produtivos
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Study API')
      .setDescription('Documentação da API do projeto')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
  }

  const port = process.env.PORT ?? 5000;
  await app.listen(port, '0.0.0.0');
  logger.log(
    `API rodando na porta ${port} | origens permitidas: ${allowedOrigins.join(', ')}`,
  );
}

void bootstrap();
