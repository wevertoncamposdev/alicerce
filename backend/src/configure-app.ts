import { Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';

// Extraído de main.ts (Fase 12, etapa 12.1, ADR 0013) para ser reusado
// tanto pela app real (bootstrap em main.ts) quanto pelos testes e2e contra
// Postgres/Redis reais (test-db/helpers/app.ts) — sem isso os testes
// subiam o AppModule sem cookie/CORS/helmet/ValidationPipe, mascarando
// qualquer falha que dependa desse pipeline.
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  const logger = new Logger('ConfigureApp');
  const isProduction = process.env.NODE_ENV === 'production';

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
}
