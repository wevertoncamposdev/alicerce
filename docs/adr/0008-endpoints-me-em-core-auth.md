# ADR 0008 — Endpoints `/me` em `core/auth`

- Status: aceito
- Data: 2026-10-19
- Escopo: autorizado pelo ADR 0006 (Fase 4 do `Plano Base.md`, etapa 4.3).
  - Em `core/`: `backend/src/core/auth/cookie.constants.ts` (novo, extraído
    de `auth.controller.ts`), `backend/src/core/auth/me.service.ts` (novo),
    `backend/src/core/auth/me.controller.ts` (novo, registrado em
    `AuthModule`), `backend/src/core/auth/dto/update-me.dto.ts` e
    `backend/src/core/auth/dto/change-my-password.dto.ts` (novos),
    `backend/src/core/auth/auth.module.ts` (registra `MeController`/
    `MeService`), `backend/prisma/models/main/access.prisma` (`User.theme`,
    `User.locale`) e migration nova.
  - Nada além dessa lista em `core/` sem perguntar.

## Contexto

O Plano Base (Fase 4, etapa 4.3) pede self-service do próprio usuário: ver/
editar o próprio perfil, trocar a própria senha, listar e encerrar as
próprias sessões. O ADR 0006 já apontou essa etapa como pendente de decisão
própria: os endpoints ficam em `core/auth` (reaproveitando a leitura do
cookie `refresh_token` que `AuthController`/`AuthService` já fazem) ou num
módulo novo (`modules/me` ou similar)?

Dois dos cinco endpoints pedidos (`GET /me/sessions`, `DELETE
/me/sessions/:familyId`) precisam resolver a "família" da sessão atual —
isto é, ler o cookie `refresh_token` da requisição, fazer o mesmo hash
SHA-256 que `AuthService.refreshTokens` já faz, e buscar o `familyId`
correspondente em `RefreshToken`. Essa leitura de cookie + hash é lógica de
auth, não de domínio.

## Decisão

Os endpoints `/me` ficam em `core/auth`, não em um módulo novo:

1. `REFRESH_COOKIE`/`COOKIE_PATH`, hoje consts privadas de
   `auth.controller.ts`, saem para `core/auth/cookie.constants.ts` —
   compartilhadas entre `AuthController` e o novo `MeController`.
2. `core/auth/me.service.ts` + `core/auth/me.controller.ts`
   (`@Controller('me')`, **sem** `@Permissions` — a única regra de acesso é
   "é o próprio usuário autenticado", já garantida pelo `AuthGuard` global),
   registrados no `AuthModule` existente, ao lado de `AuthController`.
3. `MeService` usa `PrismaService` normal (tenant-scoped via RLS), não
   `PrismaBootstrapService`: a diferença de `AuthService` é que aqui já
   existe um usuário autenticado com tenant resolvido no request-context —
   não há motivo para bypassar RLS.
4. Resolver a "sessão atual" (para `GET/DELETE /me/sessions`) é um método
   privado de `MeService` que lê o cookie da requisição, aplica o mesmo hash
   SHA-256 de `AuthService.refreshTokens` e busca o `familyId` — padrão
   copiado, não extraído para um helper compartilhado entre os dois services
   (são 4 linhas; uma dependência cruzada entre `AuthService` e `MeService`
   custaria mais do que economizaria).

Alternativa rejeitada: um módulo `modules/me` novo. Duplicaria a leitura do
cookie de refresh token sem ganhar nada — `/me` não é uma entidade de
domínio, é a própria sessão autenticada, que já é conceito de `core/auth`.

## Consequências

- `AuthController` perde as duas consts de cookie para o novo
  `cookie.constants.ts`; nenhuma outra mudança de comportamento nele.
- `MeController` não aparece no catálogo de permissões
  (`permission-catalog.ts`) — não precisa, pois não usa `@Permissions`.
- `User.theme`/`User.locale` são preferências simples (colunas tipadas,
  não um campo JSON solto) — consistente com o restante do schema, que não
  usa `Json` para nenhum campo de domínio hoje.
