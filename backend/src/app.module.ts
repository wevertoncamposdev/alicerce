import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import { PrismaModule } from '@core/prisma/prisma.module';
import { AuthModule } from '@core/auth/auth.module';
import { TenantMiddleware } from '@core/common/middleware/tenant.middleware';
import { AuditModule } from '@modules/audit/audit.module';

import { UsersModule } from '@modules/user/user.module';
import { TenantModule } from '@modules/tenant/tenant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TenantModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('api/tenant/:tenantId/(.*)');
  }
}
