import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@core/auth/auth.guard';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { PlatformAuthGuard } from './platform-auth.guard';
import { CurrentPlatformUser } from './current-platform-user.decorator';
import type { PlatformJwtPayload } from './platform-jwt-payload';

// Mesmo nível de restrição que AuthController aplica a /auth/login
// (brute-force é o mesmo risco aqui).
const BRUTE_FORCE_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

/**
 * @Public() em todos os endpoints: pula AuthGuard/TenantScopeGuard globais
 * (que exigem tenantId) — este controller não pertence ao pipeline de
 * tenant. GET /me é protegido localmente por PlatformAuthGuard, não pelos
 * guards globais (ver ADR 0012).
 */
@Controller('platform-auth')
@Public()
export class PlatformAuthController {
  constructor(private readonly platformAuthService: PlatformAuthService) {}

  @Throttle(BRUTE_FORCE_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: PlatformLoginDto) {
    return this.platformAuthService.login(dto);
  }

  @UseGuards(PlatformAuthGuard)
  @Get('me')
  getMe(@CurrentPlatformUser() platformUser: PlatformJwtPayload) {
    return this.platformAuthService.getMe(platformUser.sub);
  }
}
