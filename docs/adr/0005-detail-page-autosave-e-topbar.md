# ADR 0005 — Autosave sempre ativo, breadcrumb/ações no topbar, criação pelo Detail

- Status: aceito
- Data: 2026-10-18
- Escopo: estende o escopo do ADR 0004.
  - Em `core/`: `frontend/src/core/components/DetailView/**`, `frontend/src/core/registry/types.ts`,
    `frontend/src/core/screens/DetailViewScreen.tsx` (já autorizados pelo ADR 0004), mais
    `frontend/src/core/components/Layout/AppTopbar.tsx`,
    `frontend/src/core/components/Layout/Breadcrumbs.tsx` (novo),
    `frontend/src/core/screens/TypeViewScreen.tsx`,
    `frontend/src/core/screens/DetailCreateScreen.tsx` (novo),
    `frontend/src/core/registry/actions.ts`.
  - Fora de `core/`: `frontend/src/components/TypeView/FormView/FormView.tsx`,
    `frontend/src/core/components/DetailView/RelationView/RelationTablePanel.tsx`,
    `scripts/new-module.mjs`, módulo `feedbacks` (frontend e backend).
  - Nada além dessa lista em `core/` sem perguntar.

## Contexto

O ADR 0004 definiu: detalhe abre em modo leitura, botão "Editar" liga `FormView mode="edit"` nas
seções `editable`, estado em `?mode=edit`. Na prática isso introduziu um toggle que os módulos
legados (`users`, `roles`, `permissions`, `tenants`, no caminho `main/side/bottom`) nunca tiveram —
eles já renderizam `FormView mode="edit"` direto, sem toggle nenhum. O toggle também deixou
breadcrumb e ações (Editar, Metadados) dentro do header card, competindo por espaço com avatar,
título e abas, e não há hoje nenhum caminho para criar um registro abrindo direto o Detail (só o
Sheet de criação).

## Decisão

1. **Supersede o item 3 do ADR 0004** (leitura por padrão + botão Editar + `?mode=edit`): não
   existe mais modo leitura nem botão Editar. Seções `editable: true` do `DetailLayout.sections`
   renderizam sempre `FormView mode="edit" layout="inline"` (autosave) para quem tem a permissão
   `${permission}.update`; para quem não tem, `FieldList` somente leitura. O backend continua sendo
   a autoridade — a permissão aqui é só para não mostrar input a quem não pode salvar.
2. Breadcrumb e as ações da tela de detalhe (`DetailLayout.toolbar` + botão de metadados) saem do
   header card e vão para o `AppTopbar`, via a nova prop `breadcrumb?: BreadcrumbItem[]`. O header
   card fica só com identidade do registro: avatar, título, status, subtitle, contacts e abas.
3. Botão "Novo" pode abrir o Detail em modo rascunho quando o módulo declara
   `createMode: "detail"` (`RecordModuleDefinition.createMode`, default `"sheet"` — comportamento
   atual preservado para todo módulo que não optar explicitamente). O campo que dispara a criação é
   marcado com `FormFieldConfig.primary: true`. Navegação para `/<modulo>/new` →
   `DetailCreateScreen` → `FormView mode="draft"`; o registro só é persistido quando o campo
   `primary` perde o foco com algo preenchido, daí em diante é o autosave normal.
4. Relações cujo item aponta para um registro com Detail próprio renderizam a primeira coluna como
   link (`rowLink`, já existente em `RelationCrudHost`, estendido a `RelationTablePanel`). Itens
   sem Detail (ex.: comentários) não ganham link.
5. Metadados continuam exclusivamente no drawer direito (`MetaDataSidebar`) — isso não muda.

## Consequências

- `users`, `roles`, `permissions`, `tenants` seguem no caminho legado (`main`, sem `sections`,
  `createMode` default `"sheet"`) sem nenhuma alteração de comportamento.
- `DetailHeaderConfig.actions` é removido (migrado para `DetailLayout.toolbar`); `editHref`/
  `isEditing` saem de `DetailHeader`/`DetailView`/`DetailSections`; o parsing de `?mode=edit` em
  `DetailViewScreen.tsx` é removido.
- A checagem de permissão por seção passa a ser client-side (`useAuth().hasPermission`), não mais
  resolvida no servidor via `resolveCanEdit` — o backend segue validando toda escrita
  independentemente do que a UI mostra (AGENTS.md §4.2.6).
- `FormView` ganha um terceiro modo (`"draft"`) e a prop `layout?: "stacked" | "inline"` em
  `mode="edit"`, aditivos — `"stacked"` continua default, nenhum chamador existente muda de
  comportamento sem optar.
- Só `feedbacks` migra para `createMode: "detail"` nesta tarefa; os demais módulos ficam como
  referência do caminho `"sheet"`.
- Nenhuma primitiva shadcn nova; nenhuma dependência nova.
