import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';

import * as path from 'path';
import * as fs from 'fs';
import { I18nModule } from 'nestjs-i18n';

import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { RequestContextInterceptor } from '@core/common/interceptors/request-context.interceptor';
import { LoggingInterceptor } from '@core/common/interceptors/logging.interceptor';
import { AuditInterceptor } from '@core/common/interceptors/audit.interceptor';
import { AllExceptionsFilter } from '@core/common/filters/all-exceptions.filter';
import { validateEnv } from '@core/config/env.schema';
import { HealthModule } from '@core/health/health.module';

import { PrismaModule } from '@core/prisma/prisma.module';
import { RedisModule } from '@core/redis/redis.module';
import { StorageModule } from '@core/storage/storage.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthModule } from '@core/auth/auth.module';
import { TenantMiddleware } from '@core/common/middleware/tenant.middleware';
import { AuditModule } from '@modules/audit/audit.module';

import { UsersModule } from '@modules/user/user.module';
import { TenantModule } from '@modules/tenant/tenant.module';
import { FileModule } from '@core/files/file.module';
import { FeedbacksModule } from './modules/feedbacks/feedbacks.module';

import { RoleModule } from '@modules/role/role.module';
import { PermissionModule } from '@modules/permission/permission.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Throttle global moderado (defesa-em-profundidade contra abuso
    // genérico); rotas sensíveis a brute-force (`/auth/login`,
    // `/auth/register`) sobrescrevem com um limite mais estrito via
    // `@Throttle()` no próprio controller.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    StorageModule,
    HealthModule,
    AuthorizationModule,
    UsersModule,
    RoleModule,
    PermissionModule,
    AuthModule,
    TenantModule,
    AuditModule,
    FeedbacksModule,
    FileModule,
    I18nModule.forRoot({
      fallbackLanguage: 'pt',
      loaderOptions: {
        path: fs.existsSync(path.join(__dirname, '/i18n/'))
          ? path.join(__dirname, '/i18n/')
          : path.join(__dirname, '../i18n/'),
        watch: true,
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Precisa vir antes dos demais interceptors: abre o escopo de
    // AsyncLocalStorage que a extension de RLS do Prisma usa para descobrir o
    // tenant da requisição (ver request-context.interceptor.ts).
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes(
        { path: 'tenant/:tenantId', method: RequestMethod.ALL },
        { path: 'tenant/:tenantId/*path', method: RequestMethod.ALL },
      );
  }
}
