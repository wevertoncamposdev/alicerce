# Alicerce v1.0

## Arquitetura de relações + plano de execução (revisado)

Substitui a versão anterior do `alicerce-v1.md`. Baseado em inspeção real do schema (`prisma/models/**`) do repositório `alicerce`.

---

## 1. Taxonomia de entidades

| Termo | Definição | Regra de decisão | Onde mora |
| --- | --- | --- | --- |
| **Módulo** | Entidade independente: identidade e ciclo de vida próprios, tem `SEARCH`, listagem e rota própria. Reutilizada por outras entidades, nunca o contrário. | "Faz sentido numa lista sozinha, sem filtrar por um pai?" | `modules/<nome>/` (raiz) |
| **Módulo Relacionado** | Dois Módulos independentes conectados por N:N (tabela de junção). Cada lado continua existindo por si só; a relação é só uma lente filtrada de um sobre o outro. | "Se eu apagar a relação, os dois lados continuam fazendo sentido sozinhos?" | Sem pasta própria — vira endpoint/`RelationShell` que aponta pro `contract.tsx` do outro Módulo |
| **Feature** *(sub-recurso)* | Entidade dependente: só existe no contexto de exatamente um Módulo pai, 1:N, sem reuso, normalmente `onDelete: Cascade`. Não tem rota própria nem item de menu. | "Se eu apagar o pai, essa entidade ainda faz sentido sozinha?" (Não) | `modules/<módulo-pai>/features/<feature>/` |
| **Extensão de Módulo** | 1:1 com o pai — é basicamente um complemento dos dados dele, sem reuso possível. | "É a mesma 'coisa' que o pai, só que num formulário separado por tamanho?" | Aba/seção dentro do próprio `DetailView` do Módulo pai (não é pasta separada, não é relação) |

**Nome escolhido para sub-recurso: `features`.** Motivo prático: a pasta `features/` (padrão antigo, pré-Registry) está sendo apagada nesta mesma v1 — o nome fica livre e ganha um significado novo e mais preciso: não é mais "domínio duplicado do módulo", é literalmente "funcionalidade extra que só existe dentro de um módulo". Convenção final:

```bash
modules/<módulo>/
  config/            # contract.tsx do módulo pai
  components/
  types/
  features/
    <feature>/
      config/         # contract.tsx da feature (mesmo contrato de Módulo, sub-registrado)
      components/
      types/
```

## 2. Classificação de todas as entidades do schema atual

| Entidade | Classificação | Observação |
| --- | --- | --- |
| `User` | Módulo | — |
| `Role` | Módulo | Deixa de viver dentro de `modules/user` |
| `Permission` | Módulo | Idem |
| `Tenant` | Módulo | — |
| `Audit` | Módulo | Tem listagem/consulta própria (trilha de auditoria), não pertence a um único pai |
| `UserRole` (User↔Role) | Módulo Relacionado | `RelationShell` em `/users/[id]` → aponta pro Módulo `roles` |
| `RolePermission` (Role↔Permission) | Módulo Relacionado | `RelationShell` em `/roles/[id]` → aponta pro Módulo `permissions` |
| `Person` | Extensão de Módulo (1:1 com `User`) | Vira aba "Dados pessoais" no `DetailView` de `users`, não pasta separada |
| `Favorite` | Módulo | Referência/piloto já existente |
| `FavoriteNote` | Feature de `favorites` | `modules/favorites/features/notes/` |
| `Contact`, `PersonDocument`, `PersonAddress` | Feature de `Person` (aninhado sob a extensão em `users`) | Fora do escopo da v1 (entram quando o módulo "pessoas" for retomado) |
| `TenantBoardMember`, `TenantBoardTerm`, `TenantDocument`, `TenantArea` | Feature de `tenants` | Fora do escopo da v1 (entram quando `tenants` avançar) |
| `Task` | Módulo (adiado) | Backend já existe (`TaskModule`), sem consumidor no frontend. Fora do escopo de segurança da v1 — documentado como próximo módulo de negócio |
| `Report` | Módulo (adiado) | Mesmo tratamento de `Task` |
| `RefreshToken` | Infra pura de `auth` | Nunca vira tela; vive só no backend, dentro de `core/auth` |

**Escopo da v1.0 (segurança/base):** `User`, `Role`, `Permission`, `Tenant`, `Audit` + a extensão `Person` (só campos básicos) + a feature `notes` de `favorites` (piloto). `Task`, `Report` e as features de `Person`/`Tenant` ficam explicitamente **fora** — a v1 fecha como base pronta para receber módulos de negócio depois, não tenta cobrir tudo de uma vez.

## 3. Estrutura backend — resolvendo o problema do `permission` dentro de `user`

Hoje: `modules/user/roles.controller.ts` e `modules/user/permissions.controller.ts` moram dentro do módulo `user`, quebrando a simetria com o frontend.

**Estrutura alvo:**

```bash
backend/src/modules/
  user/
    user.controller.ts        # inclui GET/POST/DELETE :id/roles (Módulo Relacionado)
    user.service.ts
    user.module.ts
    dto/...
  role/
    role.controller.ts         # inclui GET/POST/DELETE :id/permissions (Módulo Relacionado)
    role.service.ts
    role.module.ts
    dto/
      search-role.dto.ts
  permission/
    permission.controller.ts
    permission.service.ts
    permission.module.ts
    dto/
      search-permission.dto.ts
  tenant/  (já ok)
  audit/    # extrair de onde estiver hoje, se aplicável
  favorite/
    favorite.controller.ts
    favorite.module.ts
    features/
      note/
        note.controller.ts     # rota aninhada: /favorites/:favoriteId/notes
        note.service.ts
        dto/
```

**Regra da rota de Módulo Relacionado:** o endpoint vive no controller do lado "dono da tela" (onde o `RelationShell` é exibido), não duplicado nos dois lados:

- `GET/POST/DELETE /user/:id/roles` → dentro de `user.controller.ts` (tela `/users/[id]`)
- `GET/POST/DELETE /role/:id/permissions` → dentro de `role.controller.ts` (tela `/roles/[id]`)

**Regra da rota de Feature:** sempre aninhada sob o pai, nunca uma rota top-level:

- `GET/POST/DELETE /favorite/:favoriteId/notes` → dentro de `modules/favorite/features/note/note.controller.ts`, mas registrado no mesmo `FavoriteModule`.

---

## 4. Plano de execução — passos pequenos e commitáveis

Cada item abaixo é pensado para ser **um commit isolado e testável** (`tsc --noEmit` no frontend / `npm run build` no backend antes de seguir pro próximo). Agrupados em fases lógicas, não em dias fixos — pode passar de uma semana; a ordem importa mais que o calendário.

### Fase A — Extração backend (Role e Permission viram módulos próprios)

1. Criar `modules/role/` (controller, service, module, dtos) movendo a lógica de `modules/user/roles.*` — sem alterar comportamento ainda, só mover.
2. Criar `modules/permission/` do mesmo jeito, movendo `modules/user/permissions.*`.
3. Registrar `RoleModule` e `PermissionModule` no `app.module.ts`; remover os providers antigos de dentro de `UserModule`.
4. Adicionar `search-role.dto.ts` e `search-permission.dto.ts` (`extends SearchBaseDto`) + rota `@Search()` em cada controller novo.
5. Rodar `npm run build` + testar que as rotas antigas (`/user/roles`, `/user/permissions`) foram removidas e as novas (`/role`, `/permission`) respondem.

### Fase B — Módulo Relacionado no backend

1. Adicionar `GET/POST/DELETE /user/:id/roles` em `user.controller.ts` (usa `UserRole`).
2. Adicionar `GET/POST/DELETE /role/:id/permissions` em `role.controller.ts` (usa `RolePermission`).
3. Testar os quatro endpoints novos via Swagger/Insomnia antes de tocar no frontend.

### Fase C — Frontend: Role e Permission como Módulos completos

1. Criar `modules/roles/` seguindo o contrato padrão (`config/contract.tsx`, `components/RolesListView.tsx`, `types/`) — reaproveitar o scaffold existente.
2. Criar `modules/permissions/` do zero, mesmo contrato.
3. Páginas `/roles`, `/roles/[id]`, `/permissions`, `/permissions/[id]` (list + detail básico, sem relação ainda).
4. `tsc --noEmit` limpo + navegar as 4 telas manualmente.

### Fase D — Frontend: Módulo Relacionado (RelationShell)

 1. `RelationShell`/`RelationListHost` de **Roles** dentro de `DetailView` de `/users/[id]` (consome `/user/:id/roles`).
 2. `RelationShell` de **Permissions** dentro de `DetailView` de `/roles/[id]` (consome `/role/:id/permissions`).
 3. Testar atribuir/remover role de um usuário e permission de um role ponta a ponta.

### Fase E — Extensão de Módulo: `Person` em `User`

 1. Adicionar aba/seção "Dados pessoais" no `DetailView` de `/users/[id]`, mapeando os campos básicos de `Person` (name, socialname, birthDate, gender) direto no mesmo form — sem `RelationShell`, sem módulo próprio.
 2. Backend: endpoint `PATCH /user/:id/person` (ou embutido no próprio `update` de user) para salvar os dois em conjunto.

### Fase F — Feature piloto: `notes` em `favorites`

 1. Backend: mover a lógica de notas (se já existir solta) para `modules/favorite/features/note/`, com rota aninhada `/favorite/:favoriteId/notes`.
 2. Frontend: `modules/favorites/features/notes/` com o mesmo contrato de módulo, mas registrado como sub-recurso (sem entrada própria no menu lateral).
 3. Validar esse como o padrão de referência documentado — é o exemplo que toda Feature futura (Contact, PersonDocument, TenantBoardMember...) vai copiar.

### Fase G — Limpeza final

 1. Apagar `features/` (pasta antiga, pré-Registry) por completo.
 2. Apagar `components/shells/PainelSearchShell.tsx`, `DetailShell.tsx` antigo, `RelationShell.tsx` antigo. Mover `SideShell.tsx` → `components/Layout/`.
 3. Backend: decisão sobre `TaskModule`/`Report` — recomendo remover do bootstrap ativo (`app.module.ts`), manter o código no repo, documentar em `docs/ARQUITETURA.md` como pendente.
 4. `lib/registry/bootstrap.ts`: remover import comentado de tasks (ou substituir pela decisão acima).

### Fase H — Auditoria e segurança (fecha o baseline da v1)

 1. Confirmar/adicionar `SEARCH` em `Audit` (listagem de trilha de auditoria) se ainda não existir.
 2. Garantir que toda mutação relevante (`create`/`update`/`delete` de `User`, `Role`, `Permission`, atribuição de `UserRole`/`RolePermission`) grava um registro em `Audit` — é o que fecha "Auditoria" como funcionalidade real, não só uma tabela.
 3. Revisar `roles-permissions.guard.ts` e os decorators `@Roles()`/`@Permissions()` — confirmar que os controllers novos (`role`, `permission`) estão protegidos por eles.
 4. Revisão final de autenticação: `auth.guard.ts`, refresh token, rotas públicas (`@Public()`) — checklist de que nada sensível ficou exposto durante a extração dos módulos.

### Fase I — Documentação e fechamento

 1. Atualizar `docs/ARQUITETURA.md` com a taxonomia das seções 1–2 deste documento (fonte de verdade permanente, não só um plano).
 2. Atualizar `CONTRIBUTING.md` com o contrato de Módulo, Módulo Relacionado e Feature (checklist de cada um).
 3. `README.md`: seção "O que está pronto na v1.0" (Auth, Auditoria, Roles, Permissions, Users, Tenants) e "O que vem depois" (Task, Report, Person completo, Tenant completo).
 4. Tag `v1.0.0` no repositório depois que tudo acima estiver verde (`tsc --noEmit`, `npm run build`, lint).

---

## 5. Definição de "pronto" (substitui a da versão anterior)

- Nenhuma pasta `features/` (padrão antigo) nem `components/shells` (exceto `SideShell` realocado).
- `Role` e `Permission` são módulos backend próprios (`modules/role/`, `modules/permission/`), com `SEARCH`.
- `UserRole` e `RolePermission` funcionam como Módulo Relacionado via `RelationShell` em `/users/[id]` e `/roles/[id]`.
- `Person` existe como Extensão de Módulo dentro de `/users/[id]` (não como módulo/relação separada).
- `notes` de `favorites` existe como Feature de referência em `modules/favorites/features/notes/`, documentando o padrão pra próximas features.
- Auditoria grava eventos reais de mutação nos módulos de segurança, com tela de consulta própria.
- Guards de role/permission aplicados nos módulos novos.
- `Task`/`Report` com decisão explícita registrada (não ficam "esquecidos" no meio do código).
- `docs/ARQUITETURA.md` e `CONTRIBUTING.md` refletem exatamente o estado final do código.
- Tag `v1.0.0` publicada.
