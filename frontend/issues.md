# Estado atual do frontend vs plano

| Milestone | Status |
| --- | --- |
| **X** — BFF + Auth httpOnly | ✅ 4/4 completo (proxy, cookies, retry-on-401, logout) |
| **Y** — Tenant Context no Server | ⚠️ 1/3 — tenantId vem de cookie não-httpOnly **sem validar contra o JWT**; middleware só olha sessão, não tenant; sem `AsyncLocalStorage` |
| **Z** — Data Fetching em Server Components | ❌ 0/3 — **achado crítico**: todo `page.tsx` é `"use client"`, fetch é feito via `useEffect`/`apiClient` no browser. O `lib/api-server.ts` (`server-only`) existe mas está órfão, ninguém importa |
| **W** — RBAC na UI | ⚠️ 1/3 — permissões só são checadas no client (`useAuth().hasPermission`); sem guarda server-side |
| **V** — Observabilidade + Error Boundaries | ❌ 0/3 — sem `x-request-id`, sem `error.tsx`/`not-found.tsx`, sem `loading.tsx`/Suspense |

**O achado mais importante:** o princípio "Server Component é o default" do plano ainda não foi aplicado em lugar nenhum — a arquitetura real hoje é 100% Client Component + fetch client-side, o oposto do que `development-frontend.md` define. Isso é o Milestone Z inteiro, e é o maior esforço do plano.

## Plano de continuidade (ordem ajustada pela realidade)

### Fase 1 — Fechar Milestone Y (P0, segurança — espelha backend A/B)

| # | Issue | Branch |
| --- | --- | --- |
| Y.1 | `security(tenancy)`: validar `tenantId` do cookie contra o `tenantId` do JWT no servidor antes de qualquer uso (ex.: em `getCurrentUser`/`lib/auth-server.ts`), rejeitando divergência | `security/tenant-cookie-jwt-validation` |
| Y.2 | `chore(tenancy)`: middleware.ts também bloqueia/redireciona quando tenant do cookie for inválido ou ausente para rotas que exigem tenant | `feature/middleware-tenant-validation` |
| Y.3 | `feature(tenancy)`: helper `getRequestContext()` (via `cache()` do React, já que Next não expõe ALS real para o app router) centralizando `tenantId` + `user`, substituindo chamadas manuais espalhadas | `feature/request-context-helper` |

### Fase 2 — Milestone V: Error Boundaries primeiro (rápido, alto valor, destrava Z com segurança)

| # | Issue | Branch |
| --- | --- | --- |
| V.1 | `feat(errors)`: `error.tsx` + `not-found.tsx` em `app/main/**`, tratando 401 (redirect login) e 403 (tela de acesso negado) sem vazar stacktrace | `feature/error-boundaries-auth` |
| V.2 | `feat(observability)`: propagar/gerar `x-request-id` no proxy BFF e logar no servidor | `feature/correlation-id-bff` |
| V.3 | `feat(loading)`: `loading.tsx` + `<Suspense>` nas rotas que migrarem para Server Component na Fase 3 (fazer junto, não isolado) | integrado às issues da Fase 3 |

### Fase 3 — Milestone Z: migração incremental para Server Components (maior esforço, feature por feature)

Não migrar tudo de uma vez — quebrar por feature existente (`users`, `roles`, `permissions`, `audit`), cada uma é 1 PR:

| # | Issue | Branch |
| --- | --- | --- |
| Z.1 | `refactor(data)`: converter `app/main/users/page.tsx` para Server Component usando `apiServer` (que já existe) para o GET inicial; mutations viram Server Actions (`"use server"`) com `revalidatePath`/`revalidateTag` | `refactor/users-server-components` |
| Z.2 | Repetir o padrão de Z.1 para `roles` | `refactor/roles-server-components` |
| Z.3 | Repetir o padrão de Z.1 para `permissions` | `refactor/permissions-server-components` |
| Z.4 | Repetir o padrão de Z.1 para `audit` (esse é read-only, mais simples — bom para validar o padrão primeiro, na verdade sugiro **começar por ele**) | `refactor/audit-server-components` |

Sugestão de ordem dentro da Fase 3: **audit → roles → permissions → users** (do mais simples/read-only ao mais complexo com mutations), para validar o padrão de Server Action + `revalidateTag` num caso de baixo risco antes de aplicar em `users`.

### Fase 4 — Milestone W: RBAC server-side (depende de Z para ter Server Components onde aplicar a guarda)

| # | Issue | Branch |
| --- | --- | --- |
| W.1 | `feat(rbac)`: componente `<RequireRole>`/`<RequirePermission>` Server-side, decidindo renderização no servidor usando o `RequestContext` da Fase 1 | `feature/require-permission-server` |
| W.2 | Aplicar `<RequirePermission>` nas páginas migradas na Fase 3, substituindo o check client-side em `app/main/layout.tsx` | acoplado a cada PR da Fase 3 ou PR próprio |

## Por que essa ordem

- **Y antes de Z**: não faz sentido migrar para Server Components buscando dado por tenant se o tenant ainda não é validado com segurança no servidor — replicaria a mesma vulnerabilidade, só que "no lugar certo".
- **V.1/V.2 antes de Z**: dá a rede de segurança (error boundary tratando 401/403) que os novos Server Components vão precisar quando o fetch falhar — melhor já existir antes da migração.
- **Z é sequencial por feature**, não "big bang", porque é a mudança de maior risco (muda o modelo mental de fetch inteiro) — cada PR pequeno permite validar o padrão antes de replicar.
- **W depois de Z** porque a guarda server-side só faz sentido nos componentes que já viraram Server Component.

Quer que eu comece pela **Fase 1 (Y.1)** — validação do tenant contra o JWT — já que é o gap de segurança mais parecido com o que corrigimos no backend, ou prefere que eu detalhe primeiro o padrão de migração Z.4 (audit) em código antes de abrir as issues?
