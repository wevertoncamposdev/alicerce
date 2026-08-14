import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';

import * as path from 'path';
import * as fs from 'fs';
import { I18nModule, HeaderResolver, AcceptLanguageResolver } from 'nestjs-i18n';

import { ConfigModule } from '@nestjs/config';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from '@core/common/interceptors/logging.interceptor';

import { PrismaModule } from '@core/prisma/prisma.module';
import { AuthModule } from '@core/auth/auth.module';
import { TenantMiddleware } from '@core/common/middleware/tenant.middleware';
import { AuditModule } from '@modules/audit/audit.module';

import { UsersModule } from '@modules/user/user.module';
import { TenantModule } from '@modules/tenant/tenant.module';
import { TaskModule } from '@modules/task/task.module';
import { FavoritesModule } from './modules/favorites/favorites.module';

import { RoleModule } from '@modules/role/role.module';
import { PermissionModule } from '@modules/permission/permission.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    RoleModule,
    PermissionModule,
    AuthModule,
    TenantModule,
    AuditModule,
    TaskModule,
    FavoritesModule,
    I18nModule.forRoot({
      fallbackLanguage: 'pt',
      loaderOptions: {
        path: fs.existsSync(path.join(__dirname, '/i18n/'))
          ? path.join(__dirname, '/i18n/')
          : path.join(__dirname, '../i18n/'),
        watch: true,
      }
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes(
      { path: 'tenant/:tenantId', method: RequestMethod.ALL },
      { path: 'tenant/:tenantId/*path', method: RequestMethod.ALL },
    );
  }
}
