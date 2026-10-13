import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, switchMap, tap } from 'rxjs';
import { AuditService } from '@modules/audit/audit.service';
import { PrismaService } from '@core/prisma/prisma.service';
import { AuditType } from '@core/prisma/generated/enums';

type PrismaDelegate = { findUnique?: (args: unknown) => Promise<unknown> };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  // Antes disto, toda auditoria gravava `type: 'DATA_CHANGE'` fixo — login,
  // logout e gestão de role/permission (que têm valor próprio no enum
  // AuditType) ficavam indistinguíveis de um CRUD comum.
  private resolveAuditType(url: string): AuditType {
    if (url.includes('login')) {
      return 'LOGIN';
    }

    if (url.includes('logout')) {
      return 'LOGOUT';
    }

    // Anexar/desanexar usuário ou permissão a um role: /roles/:id/users,
    // /roles/:id/permissions (ver roles.controller.ts). CRUD no catálogo de
    // permissões em si (/permissions/:id) continua DATA_CHANGE — o que
    // caracteriza PERMISSION_CHANGE é mudar QUEM tem o quê, não o catálogo.
    if (/\/roles\/[^/?]+\/(users|permissions)(\/|$)/.test(url)) {
      return 'PERMISSION_CHANGE';
    }

    return 'DATA_CHANGE';
  }

  // Extrai o nome do recurso da URL, ignorando prefixo /api e, quando
  // existir, o segmento tenant/:tenantId/.
  // "/api/favorites/019f..."        -> "favorites"
  // "/api/tenant/abc/audit"         -> "audit"
  // "/api/tenant/abc/favorites/xy"  -> "favorites"
  //
  // O frontend consulta a trilha de auditoria pelo nome singular do módulo
  // (normalizeAuditEntityName em frontend/src/screens/DetailViewScreen.tsx).
  // Como as rotas usam o nome do recurso ora no plural ("favorites",
  // "roles"), ora já singular ("user", "tenant"), normalizamos aqui também
  // para que o nome gravado sempre bata com o nome consultado — e é esse
  // mesmo nome singular que usamos como chave do Prisma Client abaixo
  // (coincide com o nome do delegate: `this.prisma.user`, `.role`, etc.).
  private resolveEntity(url: string): string {
    const resourceMatch = url.match(/^\/api\/(?:tenant\/[^/]+\/)?([^/?]+)/);
    const resource = resourceMatch?.[1] ?? url;
    return resource.endsWith('s') ? resource.slice(0, -1) : resource;
  }

  // Busca o estado da entidade ANTES da mutação, para o "before" da
  // auditoria. Só faz sentido quando: já existe uma entidade com esse id
  // (não é um POST de criação) e o nome do recurso bate com um delegate
  // real do Prisma Client — nem todo "entity" da URL é um model (ex.:
  // "audit" não é mutável, "login"/"logout" nem chegam a ter entityId).
  // Guardado em try/catch: se não bater, não deve impedir a requisição
  // principal, só deixa "before" em branco.
  private async captureBeforeState(
    method: string,
    entity: string,
    entityId: string | undefined,
  ): Promise<unknown> {
    if (method === 'POST' || !entityId) {
      return undefined;
    }

    const delegate = (this.prisma as unknown as Record<string, PrismaDelegate>)[
      entity
    ];

    if (!delegate || typeof delegate.findUnique !== 'function') {
      return undefined;
    }

    try {
      const before = await delegate.findUnique({ where: { id: entityId } });
      return before ?? undefined;
    } catch {
      return undefined;
    }
  }

  private sanitizePayload(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const clone = { ...(payload as Record<string, unknown>) };

    if ('password' in clone) {
      clone.password = '[REDACTED]';
    }

    if ('newPassword' in clone) {
      clone.newPassword = '[REDACTED]';
    }

    return clone;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const tenantId = req.tenantId;
    const method = req.method;
    const url = req.originalUrl;
    const routeId = req.params?.id as string | undefined;

    // Só audita ações relevantes (CRUD, login, onboarding, etc.) — para o
    // resto, nem vale a pena tentar capturar "before".
    const isAuditable =
      ['POST', 'PATCH', 'DELETE'].includes(method) || url.includes('login');

    if (!isAuditable) {
      return next.handle();
    }

    const entity = this.resolveEntity(url);

    // O "before" precisa ser lido ANTES do handler rodar — depois a
    // mutação já aconteceu. Por isso entra na cadeia antes de
    // `next.handle()`, não dentro do `tap()` como o resto.
    return from(this.captureBeforeState(method, entity, routeId)).pipe(
      switchMap((before) =>
        next.handle().pipe(
          tap((result) => {
            const resolvedTenantId =
              tenantId ??
              user?.tenantId ??
              result?.tenant?.id ??
              result?.user?.tenantId;
            const resolvedUserId = user?.id ?? user?.sub ?? result?.user?.id;

            void this.auditService
              .register({
                tenantId: resolvedTenantId,
                userId: resolvedUserId,
                type: this.resolveAuditType(url),
                action: method,
                entity,
                entityId: routeId ?? (result?.id as string | undefined),
                before: this.sanitizePayload(before),
                // "after" é o que o handler efetivamente persistiu/retornou
                // (a entidade salva), não o payload que o cliente mandou —
                // body da requisição pode ter campos que o service ignora,
                // transforma (ex.: hash de senha) ou nem chega a gravar.
                payload: this.sanitizePayload(result),
              })
              .catch(() => {
                // Auditoria não deve interromper o request principal.
              });
          }),
        ),
      ),
    );
  }
}
