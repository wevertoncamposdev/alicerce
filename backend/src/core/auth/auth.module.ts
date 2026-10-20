import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MeService } from './me.service';
import { MeController } from './me.controller';
import { UsersModule } from '@modules/user/user.module';
import { AuditModule } from '@modules/audit/audit.module';
import { FileModule } from '@core/files/file.module';
import { MailModule } from '@core/mail/mail.module';
import { AccountTokenModule } from './account-token.module';
import { AuthGuard } from './auth.guard';
import { TenantScopeGuard } from '@core/common/guards/tenant-scope.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' }, // 15min: curto o suficiente para limitar janela de ataque
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuditModule,
    FileModule,
    MailModule,
    AccountTokenModule,
  ],
  providers: [
    AuthService,
    MeService,
    {
      // Ordem importa: precisa rodar antes do TenantScopeGuard, que depende
      // de `request.user.tenantId` já estar populado por este guard.
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantScopeGuard,
    },
  ],
  controllers: [AuthController, MeController],
  exports: [JwtModule],
})
export class AuthModule {}
