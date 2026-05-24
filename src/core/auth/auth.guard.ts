import {
  CanActivate, // Interface que define o contrato de um guard (canActivate)
  ExecutionContext, // Contexto da execução atual (handler, classe, tipo de transporte)
  Injectable, // Decorator para habilitar injeção de dependências (DI)
  UnauthorizedException, // Exceção HTTP 401 para autenticação falha
  SetMetadata, // Função para anexar metadata customizada em classe/método
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'; // Serviço para verificar/assinar JWT
import { Reflector } from '@nestjs/core'; // Leitor de metadata em runtime
import { Request } from 'express'; // Tipo de request HTTP (Express)

// Chave de metadata usada para marcar rotas públicas
export const IS_PUBLIC_KEY = 'isPublic';

// Decorator de conveniência: @Public() aplica metadata isPublic=true
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Provider injetável pelo container do Nest
@Injectable()
export class AuthGuard implements CanActivate {
  // Injeção de dependências:
  // - jwtService: valida token
  // - reflector: lê metadata da rota/classe
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) { }

  // Método obrigatório da interface CanActivate
  // Retorna Promise<boolean> porque há operação assíncrona (verifyAsync)
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Lê metadata isPublic no método e na classe.
    // Precedência: primeiro handler (método), depois classe (controller).
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se rota pública, libera sem exigir token
    if (isPublic) {
      return true;
    }

    // Converte contexto genérico para HTTP e obtém o request
    const request = context.switchToHttp().getRequest<Request>();

    // Extrai token do header Authorization no formato "Bearer <token>"
    const token = this.extractTokenFromHeader(request);

    // Sem token: bloqueia com 401
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      // Verifica assinatura, expiração e estrutura do JWT
      const payload = await this.jwtService.verifyAsync(token);

      // Injeta payload no request para uso posterior nos handlers/services
      request['user'] = payload;
    } catch {
      // Token inválido, expirado ou malformado: 401
      throw new UnauthorizedException();
    }

    // Token válido: request autorizado
    return true;
  }

  // Método auxiliar privado para isolar parsing do header Authorization
  private extractTokenFromHeader(request: Request): string | undefined {
    // Divide "Bearer abc.def.ghi" em ["Bearer", "abc.def.ghi"]
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    // Só aceita esquema Bearer
    return type === 'Bearer' ? token : undefined;
  }
}
