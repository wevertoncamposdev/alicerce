import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@core/auth/auth.guard';
import { RequestWithAuth } from '@core/common/types/http.types';

/**
 * Guard global (registrado em AuthModule, depois do AuthGuard — a ordem dos
 * providers importa: este guard depende de `request.user` já estar populado).
 *
 * Defesa em profundidade: antes, só o `AuditController` aplicava este guard
 * localmente, e todo o resto dependia inteiramente de cada handler lembrar de
 * usar o decorator `@TenantId()`. Agora, qualquer rota autenticada (não
 * `@Public()`) é obrigada a ter um tenantId resolvido no contexto *antes* do
 * handler rodar — um controller novo que esqueça de usar `@TenantId()` em
 * algum parâmetro ainda assim não escapa sem tenant no `request`.
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const paramTenantId = request.params?.tenantId;
    const resolvedTenantId = request.tenantId ?? request.user?.tenantId;

    if (!resolvedTenantId) {
      throw new ForbiddenException('TenantId não encontrado no contexto');
    }

    // Se a rota também carrega tenantId na própria URL (ex.: tenant/:tenantId/task),
    // ele precisa bater com o do contexto autenticado — nunca o contrário.
    if (paramTenantId && paramTenantId !== resolvedTenantId) {
      throw new ForbiddenException('Acesso negado ao tenant');
    }

    request.tenantId = resolvedTenantId;
    return true;
  }
}
