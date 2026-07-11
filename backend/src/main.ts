import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@core/common/filters/all-exceptions.filter';
import { AuditInterceptor } from '@core/common/interceptors/audit.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }), // necessário atrás de proxy/load balancer (Render, etc)
  );

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
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(app.get(AuditInterceptor));

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
  logger.log(`API rodando na porta ${port} | origens permitidas: ${allowedOrigins.join(', ')}`);
}

bootstrap();