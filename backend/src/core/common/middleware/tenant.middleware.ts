import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) { }

  use(req: Request, res: Response, next: NextFunction) {
    // Preflight CORS requests should bypass tenant validation.
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    // 1. Extrai tenantId da rota
    const tenantIdFromRoute = (req as any).params?.tenantId as string | undefined;
    // 2. Extrai tenantId do header (opcional)
    const tenantIdFromHeader = req.headers['x-tenant-id'] as string | undefined;
    // 3. Extrai tenantId do JWT (se existir)
    let tenantIdFromJwt: string | undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload: any = this.jwtService.decode(token);
        tenantIdFromJwt = payload?.tenantId;
      } catch {
        throw new UnauthorizedException('JWT inválido');
      }
    }
    // 4. Decide qual usar (prioridade: rota > header > JWT)
    const tenantId = tenantIdFromRoute || tenantIdFromHeader || tenantIdFromJwt;
    if (!tenantId) {
      throw new UnauthorizedException('TenantId não informado');
    }
    // 5. Se rota e JWT existirem, comparar
    if (tenantIdFromRoute && tenantIdFromJwt && tenantIdFromRoute !== tenantIdFromJwt) {
      throw new ForbiddenException('TenantId da rota e do token não conferem');
    }
    // 6. Injeta no request
    (req as any).tenantId = tenantId;
    next();
  }
}
