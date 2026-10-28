import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { PlatformJwtPayload } from './platform-jwt-payload';

/**
 * Guard local (não registrado como APP_GUARD) — aplicado só nos
 * controllers de `core/platform-auth` e `modules/management` via
 * `@UseGuards(PlatformAuthGuard)`. Essas rotas também são `@Public()` para
 * pular `AuthGuard`/`TenantScopeGuard` globais (ver ADR 0012): este guard
 * é o único portão delas, com um `JwtService` próprio assinado por
 * `PLATFORM_JWT_SECRET` (nunca `JWT_SECRET`, o secret de tenant).
 */
@Injectable()
export class PlatformAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<PlatformJwtPayload>(token);

      if (payload.scope !== 'platform') {
        throw new UnauthorizedException();
      }

      (
        request as FastifyRequest & { platformUser: PlatformJwtPayload }
      ).platformUser = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
