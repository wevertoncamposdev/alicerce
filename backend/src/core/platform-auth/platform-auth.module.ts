import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthGuard } from './platform-auth.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('PLATFORM_JWT_SECRET'),
        // Sem refresh/rotação nesta rodada (ver ADR 0012, decisão 2): TTL
        // mais longo que o access token de tenant (15min) pra não exigir
        // login de novo a cada poucos minutos num back-office de baixo
        // tráfego. Revisitar se management ganhar mais uso.
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [PlatformAuthService, PlatformAuthGuard],
  controllers: [PlatformAuthController],
  exports: [JwtModule, PlatformAuthGuard],
})
export class PlatformAuthModule {}
