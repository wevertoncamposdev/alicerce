import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

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

  // Em BFF, normalmente só existe UMA origem confiável: o servidor Next.
  // Evite usar '*' mesmo em dev — mantenha a lista explícita.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const selfOrigin = `http://localhost:${process.env.PORT ?? 5000}`;

  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET, // assina cookies, evita tampering
  });

  // Upload de arquivo (Fase 6, ADR 0010) — limite de tamanho aqui é só uma
  // rede de segurança no nível HTTP; o limite de verdade (configurável via
  // UPLOAD_MAX_SIZE_BYTES) é checado em FilesService.upload.
  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  // Helmet para headers de segurança básicos (defesa em profundidade,
  // já que essa API não deveria ser exposta publicamente mesmo)
  await app.register(helmet, {
    contentSecurityPolicy: false, // API não serve HTML, CSP não se aplica
  });

  await app.register(cors, {
    origin: (origin, callback) => {
      // Requisição sem origin (server-to-server, curl, healthcheck) é permitida.
      // O BFF (fetch do Node no Next) geralmente NÃO envia Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin) || origin === selfOrigin) {
        callback(null, true);
        return;
      }
      logger.warn(`Origem bloqueada pelo CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-id',
      'X-Source',
    ],
    credentials: true,
    preflightContinue: false,
  });

  app.setGlobalPrefix('api');

  // AllExceptionsFilter, LoggingInterceptor e AuditInterceptor são
  // registrados como APP_FILTER/APP_INTERCEPTOR em app.module.ts — não aqui
  // — para todo comportamento "global" do app ficar visível num só lugar.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: isProduction, // não vaza detalhe de validação em prod
    }),
  );

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
