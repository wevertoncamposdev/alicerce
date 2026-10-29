# Detail Page — Contrato de UI

Referência visual: `docs/ui/reference/detail-layout.png` (abrir com Read antes de qualquer mudança).
A imagem é a fonte de verdade para **hierarquia, espaçamento e densidade**. As anotações à mão
("Detail View", "Relation View", "Metadata View") são nomes de zona, não elementos de UI.
O conteúdo da imagem (Pessoa, CPF, Tags...) é exemplo; o Alicerce é genérico.

> **Autorização:** tarefas que citam este documento estão autorizadas a alterar
> `frontend/src/core/components/DetailView/**`, `frontend/src/core/screens/DetailViewScreen.tsx`
> e `frontend/src/core/registry/types.ts` (exceção explícita ao congelamento da v1).
> O ADR 0005 amplia essa lista (`AppTopbar.tsx`, `Breadcrumbs.tsx`, `TypeViewScreen.tsx`,
> `DetailCreateScreen.tsx`, `registry/actions.ts`) para o fluxo de autosave sempre ativo e criação
> pelo Detail. Nada fora dessas listas em `core/` sem perguntar.

---

## 1. Onde estamos (código real)

| Peça | Arquivo | Situação |
| --- | --- | --- |
| Screen | `core/screens/DetailViewScreen.tsx` | Carrega record, context, audit. Mantém. |
| Motor | `core/components/DetailView/DetailView.tsx` | Flex `main` + `aside 360px`. **Substituir pela anatomia abaixo.** |
| Casco | `core/components/DetailView/DetailShell.tsx` | Só `space-y`. Vira o container da página. |
| Contrato | `core/registry/types.ts` → `DetailLayout<T>` | `main/side/bottom/relations`. **Estender (aditivo).** |
| Metadados | `MetaDataView/MetaDataSidebar.tsx` (Drawer direita) + `MetaDataView/index.tsx` (Tabs) | Já é drawer. Mantém e melhora o conteúdo. |
| Relações | `RelationView/RelationShell.tsx` (Tabs `line`) + `RelationTablePanel.tsx` | Mantém; ganha card, contador e toolbar. |
| Campos | `FormView mode="edit"` (autosave inline, `layout="inline"`) | Sempre ativo por permissão, sem toggle (ver §4). |

Usam `detailLayout` hoje: `feedbacks`, `users`, `roles`, `permissions`, `tenants`.
**Os cinco precisam continuar funcionando sem alteração** até serem migrados (ver §6).

---

## 2. Anatomia

```bash
AppTopbar: breadcrumb (Feedbacks / <título>)      [toolbar do módulo][Metadados]
──────────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────────┐
│ HEADER CARD                                                │
│ [Avatar 80]  Título  [StatusBadge]                          │
│              meta • meta • meta                            │
│              ◦ ícone+texto   ◦ ícone+texto  (opcional)     │
│ ────────────────────────────────────────────────────────── │
│ Abas: Visão geral | <abas do módulo>   (underline)         │
└────────────────────────────────────────────────────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Section card │ │ Section card │ │ Section card │   ← aba ativa
│ Section card │ │ Section card │ │              │     (colunas declaradas)
└──────────────┘ └──────────────┘ └──────────────┘
┌────────────────────────────────────────────────────────────┐
│ RELATION CARD   (sem título — abas já no topo)              │
│ Abas com contador: Comentários (3) | ...                   │
│ toolbar: busca · filtro · ordenação · ação "Novo"          │
│ tabela · rodapé "Mostrando X de Y" + paginação             │
└────────────────────────────────────────────────────────────┘

METADATA = Drawer lateral direito (MetaDataSidebar), aberto pelo botão-ícone "Metadados" no
AppTopbar. NUNCA é coluna do grid. O corpo da página usa 100% da largura.
Breadcrumb e ações (toolbar do módulo + Metadados) vivem SÓ no AppTopbar — o header card não
renderiza nenhum dos dois.
```

## 3. Regras de layout (Tailwind)

- Página: `mx-auto w-full max-w-[1400px] space-y-4 px-6 py-4`
- **Header card:** `Card` com `p-6`. Linha 1: `flex items-start gap-5`.
  - Avatar: `size-20`, fallback com iniciais (`Avatar` do ui).
  - Título `text-2xl font-semibold tracking-tight`; badge ao lado (`gap-3`, `items-center`).
  - Meta: `text-sm text-muted-foreground`, itens separados por `•` (`mx-2`).
  - Contatos: `flex flex-wrap gap-x-6 gap-y-1 text-sm`, ícone lucide `size-4 text-muted-foreground`.
  - Sem ações no header card — ver "AppTopbar" abaixo.
  - Abas: `mt-6 -mb-6 border-t` com `TabsList variant="line"`, ícone `size-4` + label.
    Sem abas extras declaradas → a barra não aparece.
- **AppTopbar:** quando a tela de detalhe declara `header`, o topbar troca o `title` de texto pelo
  `Breadcrumbs` (`core/components/Layout/Breadcrumbs.tsx`): `[{ label: módulo, href: /<módulo> },
  { label: título do registro }]`, último item `text-page-title truncate`, anteriores `Link`
  `text-muted-foreground hover:text-foreground`, separador `ChevronRight size-4`; `< sm` mostra só
  o último item. `actions` do topbar recebe, nessa ordem: `DetailLayout.toolbar` do módulo (se
  houver) e o botão-ícone de Metadados (`Button variant="outline" size="icon"` com `PanelRight`,
  `aria-label="Metadados"`, envolto em `Tooltip`).
- **Seções:** `grid grid-cols-1 gap-4 lg:grid-cols-{n} items-start`,
  onde `n` = número de colunas efetivamente usadas (1–3). Cada coluna é `flex flex-col gap-4`.
  **Nunca renderizar coluna vazia.**
- **Section card:** `Card` → corpo `px-5 pb-5 pt-3`. **Sem header de título/ícone/ação**
  (decisão do usuário: essa informação não importa pro usuário final) — `SectionCard` ainda
  aceita `title`/`icon`/`action` no tipo (os `sections` do módulo continuam declarando, outros
  consumidores dependem do tipo), só não desestrutura nem renderiza nada disso. Não reintroduzir
  esse header sem pedido explícito.
- **Campos (leitura):** `dl` com `grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-2.5 text-sm`;
  `dt text-muted-foreground`, `dd text-foreground break-words`. Valor vazio = `—`.
  Texto longo (`type: "textarea"`): `p text-sm whitespace-pre-wrap leading-relaxed`, ocupando a largura toda.
- **Relation card:** `Card p-0`; **sem header "Relacionamentos"** (mesma decisão acima — abas
  (`TabsList variant="line"`) começam direto no topo do card); contador
  `ml-1.5 text-xs tabular-nums text-muted-foreground` → `(3)`; conteúdo `p-5`.
  Toolbar: `flex flex-wrap items-center gap-2`, busca `Input` com ícone `Search` à esquerda e `max-w-sm flex-1`.
  **Relações como links:** toda relação cujo item é um registro com Detail próprio renderiza a
  primeira coluna como `Link` (`rowLink`) para `/<módulo>/<id>`, classes
  `font-medium text-foreground hover:underline`; a linha não vira clicável inteira (ações como
  remover continuam fora do link). Itens sem Detail (ex.: comentários) não têm link.
- **Responsivo:** `< lg` tudo em 1 coluna; `< sm` o breadcrumb do topbar mostra só o último item;
  o botão de Metadados já é só ícone em qualquer largura.

### Tokens

Usar só os tokens de `app/globals.css` (`--primary`, `--muted-foreground`, `--border`, `--radius`).
Nada de cor hexadecimal solta. Badges de status por mapa semântico:

| semântica | classes |
| --- | --- |
| neutral | `bg-muted text-muted-foreground` |
| info | `bg-primary/10 text-primary` |
| success | `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400` |
| warning | `bg-amber-500/10 text-amber-700 dark:text-amber-400` |
| danger | `bg-destructive/10 text-destructive` |

Tags (quando existirem): `Badge rounded-full` com as mesmas classes semânticas.

## 4. Autosave sempre ativo

> Substitui o antigo modelo "leitura por padrão + botão Editar" (ver ADR 0005, que supersede o
> item 3 do ADR 0004). **Não existe modo leitura nem botão Editar.**

- Seção com `editable: true`: quem tem a permissão `${permission}.update` (`RecordModuleDefinition
  .permission`, default = resolução atual de permissão da ação) vê `FormView mode="edit"
  layout="inline"` direto — autosave por blur, sem toggle, sem `?mode=edit` na URL. Quem não tem a
  permissão vê `FieldList` somente leitura (§3). **Proibido input/textarea pra quem não tem
  permissão.**
- Seção sem `editable: true` é sempre `FieldList`, independente de permissão.
- A checagem de permissão por seção é client-side (`useAuth().hasPermission`), já que não há mais
  um botão único "Editar" pra gatear no servidor — o backend segue validando toda escrita
  independente do que a UI mostra (AGENTS.md §4.2.6).
- Depois de um save bem-sucedido, `router.refresh()` (client-side, não chama `revalidatePath` —
  AGENTS §4.1.8) atualiza título do header/breadcrumb/auditoria sem resetar o formulário.
- Várias seções `editable` = vários `FormView` independentes; cada um salva só os campos da sua
  própria seção (`fields` filtra `formFields` antes de chegar no form).
- Ações que exigem outra permissão (ex.: status do Feedback → `feedback.manage`)
  ficam no header (badge clicável / `FeedbackStatusControl`), não no formulário.

## 5. Criação pelo Detail

Módulo com `createMode: "detail"` (`RecordModuleDefinition.createMode`, default `"sheet"` —
comportamento atual preservado pra quem não optar) troca o botão "Novo" da lista: em vez de abrir
`CreateRecordSheet`, navega para `/<módulo>/new`.

- `/<módulo>/new` renderiza `DetailCreateScreen`: mesmo casco do Detail (`AppTopbar` com
  breadcrumb `Módulo / Novo registro`, indicador de autosave), **sem** botão de Metadados; header
  card com título placeholder "Novo registro" em `text-muted-foreground`; seções com
  `FormView mode="draft"`; card de Relacionamentos desabilitado com "Salve o registro para
  adicionar relacionamentos." (sem abas). Módulo sem `sections` → um único card com todos os
  `formFields`; campos `createOnly` entram no rascunho (único momento em que podem ser
  preenchidos).
- O campo marcado `FormFieldConfig.primary: true` (um por módulo) é o gatilho: nenhum request
  acontece até ele ter valor não vazio. No primeiro commit (blur/Enter) de qualquer campo depois
  disso, valida os campos obrigatórios e cria via `createRecordDraftAction` — a partir daí vira o
  autosave normal (PATCH), e a URL troca para `/<módulo>/<id>` com o foco indo pro próximo campo
  (`?focus=`, removido da URL sem novo request depois de aplicado).
- Sair da tela sem preencher o campo `primary` não cria nada (sem registro órfão).
- Módulos que não tornam seu `primary` opcional-tolerante na criação (ex.: campo único que exige
  outro obrigatório junto, como senha) ficam em `createMode: "sheet"` — é uma decisão por módulo,
  não automática.

## 6. Contrato (extensão aditiva de `DetailLayout<T>` e `RecordModuleDefinition<T>`)

```ts
export type DetailHeaderConfig = {
  title: string;
  subtitle?: string[];                       // vira "meta • meta • meta"
  avatar?: { src?: string; fallback: string };
  status?: React.ReactNode;                  // ex.: <FeedbackStatusControl />
  contacts?: { icon: LucideIcon; text: string; href?: string }[];
  // `actions` foi removido (ADR 0005) — use `DetailLayout.toolbar`, que vai pro AppTopbar.
};

export type DetailSection<T> = {
  key: string;
  title: string;
  icon?: LucideIcon;
  column?: 1 | 2 | 3;                        // default 1
  editable?: boolean;                        // autosave sempre ativo pra quem tem permissão (§4)
  fields?: (keyof T & string)[];             // renderização padrão (dl) a partir de formFields
  render?: (ctx: DetailContext<T>) => React.ReactNode; // escape hatch
};

export type DetailTab<T> = {
  key: string; label: string; icon?: LucideIcon;
  content: (ctx: DetailContext<T>) => React.ReactNode;
};

export type RelationTabConfig = {
  key: string; label: string; content: React.ReactNode;
  icon?: LucideIcon;
  count?: number;
};

export type DetailLayout<T> = {
  header?: (ctx: DetailContext<T>) => DetailHeaderConfig;
  sections?: DetailSection<T>[];             // conteúdo da aba "Visão geral"
  tabs?: DetailTab<T>[];                     // abas extras no header
  toolbar?: (ctx: DetailContext<T>) => React.ReactNode; // NOVO (ADR 0005): ações no AppTopbar, antes do botão de Metadados
  // EXISTENTE — continua funcionando
  main?: (ctx: DetailContext<T>) => React.ReactNode;   // passa a opcional
  side?: (ctx: DetailContext<T>) => React.ReactNode;   // deprecated: ignorado se `sections` existir
  bottom?: (ctx: DetailContext<T>) => React.ReactNode;
  relations?: (ctx: DetailContext<T>) => RelationTabConfig[];
};

export type RecordModuleDefinition<T> = {
  // ...
  permission?: string;                       // NOVO (ADR 0005): prefixo de permissão (ex. "feedback"); default = resolução atual
  createMode?: "sheet" | "detail";            // NOVO (ADR 0005): default "sheet" — ver §5
};

export type FormFieldConfig<T> = {
  // ...
  primary?: boolean;                         // NOVO (ADR 0005): campo que dispara a criação no Detail (§5); um por módulo
};
```

Regras do motor (`DetailView.tsx`):

- `header` ausente → header mínimo: título = `record.title ?? record.name ?? mod.label`, sem avatar.
- `sections` presente → grid de §3; senão → renderiza `main` como hoje (módulos não migrados).
- `relations` → sempre dentro do Relation card de §3; itens cujo módulo tem Detail recebem `rowLink`
  (§3, "Relações como links") — passado como prop direta em `RelationCrudHost`/`RelationTablePanel`,
  não faz parte do tipo `RelationTabConfig`.
- Metadados continuam vindo de `detailConfig` (audit/context). O módulo não monta drawer.

Componentes em `core/components/DetailView/`:
`DetailHeader.tsx`, `DetailSections.tsx`, `SectionCard.tsx`, `FieldList.tsx`, `EditableSection.tsx`
(NOVO — decide `FormView mode="edit"` vs `FieldList` por permissão, client), `RelationCard.tsx`.
`core/components/Layout/Breadcrumbs.tsx` (NOVO) e `core/screens/DetailCreateScreen.tsx` (NOVO).
Primitivas só do `components/ui` existente (Card, Tabs, Badge, Avatar, Button, Drawer, Table).

## 7. Metadata Drawer

Mantém `MetaDataSidebar` (Drawer `direction="right"`), trigger vira o botão-ícone do AppTopbar (§3).
Largura `sm:max-w-[400px]`, altura total (sem `max-h-[80vh]`). **Sem `DrawerHeader`/título
"Metadados"** (decisão do usuário: desnecessário pro usuário final) — fechar continua
funcionando pelo comportamento padrão do `Drawer` (clique fora, Esc), sem botão de fechar
explícito.
Abas: **Auditoria** (primeira e default) · Contexto, `TabsList variant="line"` igual ao resto do
Detail (§3). `tags/notes/attachments` continuam reservadas (não renderizar aba vazia).

Cada bloco de conteúdo (abaixo) fica dentro de um `Card` — mesmo outline de `SectionCard`/
`RelationCard`, só que sem título (`SectionCard`) já que a própria natureza do bloco (ícone +
texto) já identifica o conteúdo.

Aba Auditoria, de cima para baixo:

1. Card com "Registro criado em" (ícone `CalendarPlus`, data `dd/MM/yyyy • HH:mm`, "por {email}")
   e "Última atualização" (ícone `Clock`, mesmo formato) juntos.
2. Card "Histórico de alterações" (ícone `History`): timeline vertical (`border-l` + bolinha
   `size-2` colorida por ação: create=emerald, update=primary, delete=destructive), cada item
   com data, resumo e autor.
3. Card "Informações adicionais" (ícone `Info`): os `ContextItem[]` como `dl` (§3, mesmo grid de
   `FieldList`).

Datas sempre `pt-BR` (`dd/MM/yyyy • HH:mm`), nunca ISO cru.

## 8. Feedback (primeiro consumidor)

- `header`: title, status = `<FeedbackStatusControl />`, subtitle = ["Criado em dd/MM/yyyy"].
- `sections`: uma seção "Detalhes" (`FileText`), `fields: ["title","description"]`, `editable: true`, `column: 1`.
  Com uma só coluna usada, o grid é 1 coluna (largura total), sem buraco.
- Comentários saem do `bottom` e viram `relations` → aba "Comentários" com `count`, usando o `RelationTablePanel` atual.
- `side` removido.
- `title` tem `primary: true`, `description` tem `required: false`; `createMode: "detail"` — é o
  único módulo com o fluxo de criação do §5 nesta tarefa.

## 9. Showcase (referência de validação)

Rota `app/(app)/develop/detail-showcase/page.tsx` com módulo fictício em memória
(`modules/develop/showcase/`) imitando a Pessoa do mockup: avatar, 3 colunas,
~6 seções, 2 abas extras, 3 relações com contador, audit com 4 entradas.
Sem backend. Serve só para comparar com a imagem. O Feedback é magro demais para validar layout.
Relação "Familiares" (lista de pessoas em memória, nome como `rowLink` para
`/develop/detail-showcase/<id>`) é o caso de validação de "Relações como links" (§3): abrir
Pessoa 1 → clicar em Pessoa 2 → Detail de Pessoa 2 com breadcrumb "Showcase / Pessoa 2".

Segundo exemplo de validação: a demo em JSON (`modules/develop/demo/**`,
U1 — `docs/PLAN-fundacao-ux.md`), com busca/paginação/ordenação reais
(o Showcase ignora `args`) e três módulos ligados entre si (Pessoas,
Atividades, Atendimentos) — navegação só por link entre eles, mesmo
padrão de "Relações como links" do Showcase, agora com dados de
verdade por trás da lista. Ver `docs/ui/list-page.md`.

## 10. Critérios de aceite

- [ ] `/develop/detail-showcase` em 1440px é visualmente equivalente à referência (zonas, proporções, densidade).
- [ ] `/feedbacks/[id]`: sem área vazia, sem textarea em leitura, comentários no Relation card com contador.
- [ ] Breadcrumb e ações só no AppTopbar; nenhum botão Editar; seções editáveis são autosave sempre.
- [ ] Metadados só no drawer; corpo em 100% da largura.
- [ ] `/feedbacks/new` cria o registro ao sair do campo `title`, troca pra `/feedbacks/<id>` com foco
      na Descrição; sair sem preencher `title` não cria nada.
- [ ] `users`, `roles`, `permissions`, `tenants` abrem sem erro, sem mudança de contrato e "Novo"
      continua Sheet.
- [ ] 375px: 1 coluna, sem scroll horizontal.
- [ ] Dark mode correto (só tokens).
- [ ] `npx tsc --noEmit && npm run lint && npm run build` no frontend.

## 11. Como verificar visualmente

Ao fim de cada etapa: subir o front, abrir a rota com Playwright em 1440×900 e 375×812,
salvar screenshot em `.claude/screenshots/<etapa>.png`, abrir a referência e o screenshot,
e listar o que ainda diverge **antes** de declarar a etapa pronta.
