# Alicerce v1.0

## Definição do framework + plano de execução da semana

Baseado em inspeção real do repositório `study` (frontend e backend) em 26/07/2026.

---

## 1. O que é o Alicerce

**Alicerce** é o framework pessoal derivado do estudo do `system_development` (TerceiroGestor), reconstruído no repositório `study` peça por peça, com o objetivo de servir como **template reutilizável** para novos projetos full-stack (o primeiro consumidor real é o Capital Humano/FAROL).

**Princípio central:** um módulo de domínio (users, roles, tenants...) é sempre composto pelas mesmas peças, na mesma ordem, seguindo um contrato fixo — nunca improvisado por página. Isso é o que separa um framework de uma coleção de páginas parecidas.

**Regra de dependência (unidirecional, vale para frontend e backend):**

```bash
Frontend:  app → screens → modules → components (motor) → lib (núcleo)
Backend:   controller → service → prisma → banco
```

Nunca o inverso. Um módulo nunca importa outro módulo diretamente — se dois módulos precisam se relacionar, isso é uma `RelationShell`/relação explícita, não um import cruzado.

---

## 2. Diagnóstico atual (o que existe de fato, hoje)

### Frontend — `modules/` vs `features/`

| Domínio | `modules/` (padrão novo) | `features/` (padrão antigo) | Status |
| --- | --- | --- | --- |
| favorites | ✅ completo (list+form+detail+relation) | — | referência, migrado |
| users | ✅ (corrigido hoje) | ✅ ainda existe (morto?) | migrado, mas `features/users` sobrando |
| tenants | ✅ (corrigido hoje) | — | migrado |
| roles | ⚠️ scaffold vazio (`.gitkeep` só) | ✅ implementação real (`useRoles`, `roleService`) | **não migrado** |
| permissions | ❌ não existe | ✅ implementação real | **não migrado** |
| audit | ❌ não existe | ✅ implementação real | **não migrado** |
| auth | ❌ não existe | ✅ implementação real | **não migrado** (auth é infra, não CRUD — tratamento especial) |

Páginas `permissions`, `audit`, `roles`, `dashboard` ainda usam o **motor antigo**: `components/shells/` (`PainelSearchShell`, `DetailShell`, `RelationShell`) em vez do motor atual (`SearchBar`+`PageControlPanel`, `DetailShellEngine`, `RelationListHost`+`DetailRelationTablePanel`).

`components/shells/SideShell` é a exceção: usado em `login`/`register`, é um componente de layout legítimo, não pertence à dívida técnica de migração.

### Backend — cobertura de SEARCH

| Módulo | Controller/Service existe | Rota `@Search()` existe |
| --- | --- | --- |
| tenant | ✅ | ✅ |
| user | ✅ | ✅ |
| favorites | ✅ | ✅ |
| roles | ✅ (dentro de `modules/user/roles.*`) | ❌ falta |
| permissions | ✅ (dentro de `modules/user/permissions.*`) | ❌ falta |
| audit | verificar (não inspecionado a fundo ainda) | ❌ falta |
| task | ✅ módulo completo, registrado no `app.module.ts` | ❌ falta — **e não tem nenhum consumidor no frontend** |

**Achado relevante:** `roles` e `permissions` não são módulos Nest próprios — vivem dentro de `modules/user/` (`roles.controller.ts`, `permissions.controller.ts`). Isso funciona, mas quebra a simetria com o frontend (onde cada um vira `modules/roles`, `modules/permissions` separados). Decisão a tomar: manter agrupado em `user/` ou extrair para módulos Nest próprios (`modules/role/`, `modules/permission/`) espelhando o frontend 1:1. **Recomendo extrair** — mantém a regra "1 domínio = 1 pasta" simétrica nas duas pontas, e facilita reuso como template.

`TaskModule` existe por completo no backend mas **não tem nenhum módulo frontend nem rota registrada** (`lib/registry/bootstrap.ts` tem até o import comentado). É candidato natural para a tarefa de "limpeza de funcionalidades não utilizadas" — decidir entre remover ou formalizar como módulo real.

---

## 3. Contrato de módulo Alicerce (frontend)

```bash
modules/<nome>/
  config/
    contract.tsx        # defineRecordModule + registerModule — única fonte de verdade
    provider.ts          # dataHandlers via apiServer (search/read/create/update/delete)
  components/
    <Nome>ListView.tsx    # "use client" — único ponto que importa ColumnDef/cell renderers
    columns.ts             # nunca importado fora do *ListView.tsx
  types/
    types.ts
  actions/                # Server Actions do módulo (autosave, relação), se houver
  hooks/                  # só se precisar de estado client-side extra
  constants/
```

**Checklist obrigatório (evita a classe de bug corrigida hoje em `users`/`tenants`):**

1. `columns.ts` só é importado dentro de `<Nome>ListView.tsx`.
2. `<Nome>ListView.tsx` sempre começa com `"use client"`.
3. `contract.tsx` referencia só o wrapper (`<UsersListView data={data} />`), nunca `<ListView columns={...} />` direto.
4. Contract com JSX é sempre `.tsx`.
5. `formFields` extraído como constante antes do `defineRecordModule` (evita referência circular).
6. Termina com `registerModule(xModule)`.

## 4. Contrato de módulo Alicerce (backend)

```bash
modules/<nome>/
  dto/
    create-<nome>.dto.ts
    update-<nome>.dto.ts
    search-<nome>.dto.ts   # extends SearchBaseDto
  <nome>.controller.ts      # inclui método search() com @Search()
  <nome>.service.ts          # search() usa Prisma findMany + count via Promise.all
  <nome>.module.ts
```

**Padrão SEARCH (confirmado no código real de `tenant`):**

```ts
// dto/search-<nome>.dto.ts
export class Search<Nome>Dto extends SearchBaseDto {}

// <nome>.controller.ts
@Search()
@ApiOperation({ summary: 'Buscar <nome>' })
search(@Body() query: Search<Nome>Dto) {
  return this.<nome>Service.search(query);
}
```

`SearchBaseDto` já cobre `searchText`, `groupBy`, `sort`, `pagination`, `filters` — módulo-específico só estende se precisar de filtro adicional.

---

## 5. Plano da semana

### Dia 1 — Rename + fundação do documento

- [X] Renomear repositório GitHub `study` → `alicerce` (Settings → Repository name). Atualizar `git remote set-url origin` localmente e em qualquer clone/CI.
- [X] Atualizar `package.json` (`name`), `README.md` (topo), badges se houver.
- [x] Commitar este documento como `CONTRIBUTING.md` ou `docs/ARQUITETURA.md` na raiz — vira a fonte de verdade do contrato de módulo.
- [x] Decidir e registrar a decisão sobre `TaskModule` (manter como módulo real futuro, ou remover agora). Não deixar em limbo. - Remover pois não faz parte da arquitetura.

### Dias 2–3 — Migração de módulos (backend primeiro, depois frontend, módulo por módulo)

Ordem sugerida (do mais simples ao mais acoplado):

1. [] **permissions** → extrair `modules/permission/` no backend (controller+service+dtos próprios, com SEARCH) → criar `modules/permissions/` no frontend seguindo o contrato da seção 3.
2. [] **roles** → mesmo processo (`modules/role/` backend, `modules/roles/` frontend — já tem scaffold, só preencher).
3. [x] **tenants** já migrado — só confirmar que segue 100% o contrato (rota SEARCH já existe).
4. [] **audit** → confirmar se já tem SEARCH; senão, adicionar. Migrar frontend para `modules/audit/`.
5. [] **auth** → não é CRUD listável, então não segue o contrato de `defineRecordModule` — mantém como infraestrutura em `lib/`/`core`, mas revisar se algo de `features/auth` pode virar `modules/auth` só para os componentes de formulário (login/register), por consistência de nome.

Cada módulo migrado = 1 commit isolado testável (rodar `npx tsc --noEmit` + testar a tela no navegador antes do próximo).

### Dia 4 — CRUD completo de gerenciamento (permissions, roles, users)

- [ ] Telas de detail completas para `permissions` e `roles` (metadata sidebar + form), espelhando o que `users`/`favorites` já têm.
- [ ] Relação `roles ↔ permissions` (RolePermission) e `users ↔ roles` (UserRole) como `RelationShell`/`RelationListHost` — já existem os DTOs (`attach-role-permission`, `attach-role-user`) no backend, falta a rota SEARCH e a UI de relação seguindo o padrão de `favorites`/`FavoriteNote` (Fase 7).
- [ ] Tela de gerenciamento de usuário mostra roles atribuídas; tela de role mostra permissions atribuídas — fecha o ciclo de "gerenciamento completo de usuários e permissões".

### Dia 5 — Limpeza + organização final

- [ ] Apagar `features/` inteira (depois de confirmar que os 6 módulos foram migrados).
- [ ] Apagar `components/shells/PainelSearchShell.tsx`, `DetailShell` (versão antiga, se distinta da atual), `RelationShell.tsx`. Mover `SideShell.tsx` para `components/Layout/`.
- [ ] Atualizar `lib/registry/bootstrap.ts` removendo o import comentado de tasks (ou implementando, conforme decisão do Dia 1).
- [ ] Rodar `npx tsc --noEmit` e `eslint` no projeto inteiro — zero erros antes de fechar a semana.
- [ ] Backend: revisar se sobra algum service/controller sem uso (grep de imports cruzados, como fizemos com `task` hoje).
- [ ] Atualizar `CONTRIBUTING.md`/`docs/ARQUITETURA.md` com o estado final real (não o planejado) — a documentação só vale se refletir o código.

---

## 6. Definição de "pronto" para a v1.0

- Nenhuma pasta `features/` no repositório.
- Nenhum resquício de `components/shells` exceto `SideShell` (realocado).
- 6 módulos (`audit`, `permissions`, `roles`, `tenants`, `users`, e `auth` como infraestrutura) seguindo o contrato único da seção 3/4.
- CRUD completo e relação funcional entre `users`, `roles`, `permissions`.
- Toda rota de listagem no backend com `SEARCH` implementado.
- `tsc --noEmit` e lint limpos.
- Repositório renomeado para `alicerce`, com `CONTRIBUTING.md`/`docs/ARQUITETURA.md` documentando o contrato.
