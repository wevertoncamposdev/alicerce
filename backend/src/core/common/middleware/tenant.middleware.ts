import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: FastifyRequest, res: FastifyReply, next: (err?: Error) => void) {
    // Preflight CORS requests should bypass tenant validation.
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const params = req.params as Record<string, string | undefined>;
    const tenantIdFromRoute = params?.tenantId;

    const headerValue = req.headers['x-tenant-id'];
    const tenantIdFromHeader = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    // O JWT é a única fonte confiável de tenantId (AGENTS.md 3.2.1) — rota e
    // header, quando presentes, só servem para confirmar o que já está no
    // token, nunca para substituí-lo.
    let tenantIdFromJwt: string | undefined;
    const authHeaderValue = req.headers['authorization'];
    const authHeader = Array.isArray(authHeaderValue)
      ? authHeaderValue[0]
      : authHeaderValue;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = this.jwtService.decode(token) as
          | { tenantId?: string }
          | null;
        tenantIdFromJwt = payload?.tenantId;
      } catch {
        throw new UnauthorizedException('JWT inválido');
      }
    }

    if (!tenantIdFromJwt) {
      throw new UnauthorizedException('TenantId não informado');
    }

    if (tenantIdFromRoute && tenantIdFromRoute !== tenantIdFromJwt) {
      throw new ForbiddenException('TenantId da rota e do token não conferem');
    }
    if (tenantIdFromHeader && tenantIdFromHeader !== tenantIdFromJwt) {
      throw new ForbiddenException(
        'TenantId do header e do token não conferem',
      );
    }

    (req as FastifyRequest & { tenantId?: string }).tenantId = tenantIdFromJwt;
    next();
  }
}
