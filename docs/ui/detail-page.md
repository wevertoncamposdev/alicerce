# Detail Page — Contrato de UI

Referência visual: `docs/ui/reference/detail-layout.png` (abrir com Read antes de qualquer mudança).
A imagem é a fonte de verdade para **hierarquia, espaçamento e densidade**. As anotações à mão
("Detail View", "Relation View", "Metadata View") são nomes de zona, não elementos de UI.
O conteúdo da imagem (Pessoa, CPF, Tags...) é exemplo; o Alicerce é genérico.

> **Autorização:** tarefas que citam este documento estão autorizadas a alterar
> `frontend/src/core/components/DetailView/**`, `frontend/src/core/screens/DetailViewScreen.tsx`
> e `frontend/src/core/registry/types.ts` (exceção explícita ao congelamento da v1).
> Nada fora dessa lista em `core/` sem perguntar.

---

## 1. Onde estamos (código real)

| Peça | Arquivo | Situação |
|---|---|---|
| Screen | `core/screens/DetailViewScreen.tsx` | Carrega record, context, audit. Mantém. |
| Motor | `core/components/DetailView/DetailView.tsx` | Flex `main` + `aside 360px`. **Substituir pela anatomia abaixo.** |
| Casco | `core/components/DetailView/DetailShell.tsx` | Só `space-y`. Vira o container da página. |
| Contrato | `core/registry/types.ts` → `DetailLayout<T>` | `main/side/bottom/relations`. **Estender (aditivo).** |
| Metadados | `MetaDataView/MetaDataSidebar.tsx` (Drawer direita) + `MetaDataView/index.tsx` (Tabs) | Já é drawer. Mantém e melhora o conteúdo. |
| Relações | `RelationView/RelationShell.tsx` (Tabs `line`) + `RelationTablePanel.tsx` | Mantém; ganha card, contador e toolbar. |
| Campos | `FormView mode="edit"` (autosave inline, `variant: "inline-detail"`) | Fica restrito ao **modo edição** (ver §4). |

Usam `detailLayout` hoje: `feedbacks`, `users`, `roles`, `permissions`, `tenants`.
**Os cinco precisam continuar funcionando sem alteração** até serem migrados (ver §6).

---

## 2. Anatomia

```
AppTopbar (já existe: título do módulo, busca, sino, avatar)
──────────────────────────────────────────────────────────────
Breadcrumb   Feedbacks / <título>
┌────────────────────────────────────────────────────────────┐
│ HEADER CARD                                                │
│ [Avatar 80]  Título  [StatusBadge]     [Editar][Imprimir][⋯][Metadados]
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
│ RELATION CARD   ícone + "Relacionamentos"                  │
│ Abas com contador: Comentários (3) | ...                   │
│ toolbar: busca · filtro · ordenação · ação "Novo"          │
│ tabela · rodapé "Mostrando X de Y" + paginação             │
└────────────────────────────────────────────────────────────┘

METADATA = Drawer lateral direito (MetaDataSidebar), aberto pelo botão "Metadados".
NUNCA é coluna do grid. O corpo da página usa 100% da largura.
```

## 3. Regras de layout (Tailwind)

- Página: `mx-auto w-full max-w-[1400px] space-y-4 px-6 py-4`
- **Header card:** `Card` com `p-6`. Linha 1: `flex items-start gap-5`.
  - Avatar: `size-20`, fallback com iniciais (`Avatar` do ui).
  - Título `text-2xl font-semibold tracking-tight`; badge ao lado (`gap-3`, `items-center`).
  - Meta: `text-sm text-muted-foreground`, itens separados por `•` (`mx-2`).
  - Contatos: `flex flex-wrap gap-x-6 gap-y-1 text-sm`, ícone lucide `size-4 text-muted-foreground`.
  - Ações: `ml-auto flex gap-2`. Primária `Button` default; Imprimir `variant="outline"`;
    `⋯` `variant="outline" size="icon"`; Metadados `variant="outline" size="icon"` com ícone `PanelRight`.
  - Abas: `mt-6 -mb-6 border-t` com `TabsList variant="line"`, ícone `size-4` + label.
    Sem abas extras declaradas → a barra não aparece.
- **Seções:** `grid grid-cols-1 gap-4 lg:grid-cols-{n} items-start`,
  onde `n` = número de colunas efetivamente usadas (1–3). Cada coluna é `flex flex-col gap-4`.
  **Nunca renderizar coluna vazia.**
- **Section card:** `Card` → header `flex items-center gap-2 px-5 pt-5 text-sm font-semibold`
  (ícone `size-4 text-muted-foreground`, ação opcional à direita `text-xs text-primary`),
  corpo `px-5 pb-5 pt-3`.
- **Campos (leitura):** `dl` com `grid grid-cols-[minmax(110px,40%)_1fr] gap-x-4 gap-y-2.5 text-sm`;
  `dt text-muted-foreground`, `dd text-foreground break-words`. Valor vazio = `—`.
  Texto longo (`type: "textarea"`): `p text-sm whitespace-pre-wrap leading-relaxed`, ocupando a largura toda.
- **Relation card:** `Card p-0`; header `px-5 pt-5`; `TabsList variant="line"` com contador
  `ml-1.5 text-xs tabular-nums text-muted-foreground` → `(3)`; conteúdo `p-5`.
  Toolbar: `flex flex-wrap items-center gap-2`, busca `Input` com ícone `Search` à esquerda e `max-w-sm flex-1`.
- **Responsivo:** `< lg` tudo em 1 coluna; ações do header quebram para baixo do título
  (`flex-col sm:flex-row`); botões viram só ícone abaixo de `sm`.

### Tokens

Usar só os tokens de `app/globals.css` (`--primary`, `--muted-foreground`, `--border`, `--radius`).
Nada de cor hexadecimal solta. Badges de status por mapa semântico:

| semântica | classes |
|---|---|
| neutral | `bg-muted text-muted-foreground` |
| info | `bg-primary/10 text-primary` |
| success | `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400` |
| warning | `bg-amber-500/10 text-amber-700 dark:text-amber-400` |
| danger | `bg-destructive/10 text-destructive` |

Tags (quando existirem): `Badge rounded-full` com as mesmas classes semânticas.

## 4. Leitura × edição

O mockup mostra **leitura por padrão** + botão **Editar**. Regra:

- Padrão: seções renderizam `dl` somente leitura (§3). **Proibido input/textarea em modo leitura.**
- "Editar" (só se o usuário tem permissão de update) troca as seções editáveis para
  `FormView mode="edit"` (autosave inline atual, sem mudar o hook). O botão vira "Concluir".
- Estado em `?mode=edit` na URL (mesmo padrão do `list-query-state`), para sobreviver a refresh.
- Ações que exigem outra permissão (ex.: status do Feedback → `feedback.manage`)
  ficam no header (badge clicável / `FeedbackStatusControl`), não no formulário.

## 5. Contrato (extensão aditiva de `DetailLayout<T>`)

```ts
export type DetailHeaderConfig = {
  title: string;
  subtitle?: string[];                       // vira "meta • meta • meta"
  avatar?: { src?: string; fallback: string };
  status?: React.ReactNode;                  // ex.: <FeedbackStatusControl />
  contacts?: { icon: LucideIcon; text: string; href?: string }[];
  actions?: React.ReactNode;                 // ações extras do módulo (entram antes do ⋯)
};

export type DetailSection<T> = {
  key: string;
  title: string;
  icon?: LucideIcon;
  column?: 1 | 2 | 3;                        // default 1
  editable?: boolean;                        // participa do modo Editar
  fields?: (keyof T & string)[];             // renderização padrão (dl) a partir de formFields
  render?: (ctx: DetailContext<T>) => React.ReactNode; // escape hatch
};

export type DetailTab<T> = {
  key: string; label: string; icon?: LucideIcon;
  content: (ctx: DetailContext<T>) => React.ReactNode;
};

export type RelationTabConfig = {
  key: string; label: string; content: React.ReactNode;
  icon?: LucideIcon;                         // NOVO, opcional
  count?: number;                            // NOVO, opcional
};

export type DetailLayout<T> = {
  // NOVO (todos opcionais)
  header?: (ctx: DetailContext<T>) => DetailHeaderConfig;
  sections?: DetailSection<T>[];             // conteúdo da aba "Visão geral"
  tabs?: DetailTab<T>[];                     // abas extras no header
  // EXISTENTE — continua funcionando
  main?: (ctx: DetailContext<T>) => React.ReactNode;   // passa a opcional
  side?: (ctx: DetailContext<T>) => React.ReactNode;   // deprecated: ignorado se `sections` existir
  bottom?: (ctx: DetailContext<T>) => React.ReactNode;
  relations?: (ctx: DetailContext<T>) => RelationTabConfig[];
};
```

Regras do motor (`DetailView.tsx`):
- `header` ausente → header mínimo: título = `record.title ?? record.name ?? mod.label`, sem avatar.
- `sections` presente → grid de §3; senão → renderiza `main` como hoje (módulos não migrados).
- `relations` → sempre dentro do Relation card de §3.
- Metadados continuam vindo de `detailConfig` (audit/context). O módulo não monta drawer.

Componentes novos ficam em `core/components/DetailView/`:
`DetailHeader.tsx`, `DetailSections.tsx`, `SectionCard.tsx`, `FieldList.tsx`, `RelationCard.tsx`.
Primitivas só do `components/ui` existente (Card, Tabs, Badge, Avatar, Button, Drawer, Table).

## 6. Metadata Drawer

Mantém `MetaDataSidebar` (Drawer `direction="right"`), trigger vira o botão-ícone do header.
Largura `sm:max-w-[400px]`, altura total (sem `max-h-[80vh]`).
Abas: **Auditoria** (primeira e default) · Contexto. `tags/notes/attachments` continuam reservadas (não renderizar aba vazia).

Aba Auditoria, de cima para baixo:
1. Bloco "Registro criado em": ícone `CalendarPlus`, data `dd/MM/yyyy • HH:mm`, "por {email}".
2. Bloco "Última atualização": ícone `History`, mesmo formato.
3. "Histórico de alterações": timeline vertical (`border-l` + bolinha `size-2` colorida por ação:
   create=emerald, update=primary, delete=destructive), cada item com data, resumo e autor.
4. "Informações adicionais": os `ContextItem[]` como `dl` (§3).

Datas sempre `pt-BR` (`dd/MM/yyyy • HH:mm`), nunca ISO cru.

## 7. Feedback (primeiro consumidor)

- `header`: title, status = `<FeedbackStatusControl />`, subtitle = ["Criado em dd/MM/yyyy"].
- `sections`: uma seção "Detalhes" (`FileText`), `fields: ["title","description"]`, `editable: true`, `column: 1`.
  Com uma só coluna usada, o grid é 1 coluna (largura total), sem buraco.
- Comentários saem do `bottom` e viram `relations` → aba "Comentários" com `count`, usando o `RelationTablePanel` atual.
- `side` removido.

## 8. Showcase (referência de validação)

Rota `app/(app)/develop/detail-showcase/page.tsx` com módulo fictício em memória
(`modules/develop/showcase/`) imitando a Pessoa do mockup: avatar, 3 colunas,
~6 seções, 2 abas extras, 3 relações com contador, audit com 4 entradas.
Sem backend. Serve só para comparar com a imagem. O Feedback é magro demais para validar layout.

## 9. Critérios de aceite

- [ ] `/develop/detail-showcase` em 1440px é visualmente equivalente à referência (zonas, proporções, densidade).
- [ ] `/feedbacks/[id]`: sem área vazia, sem textarea em leitura, comentários no Relation card com contador.
- [ ] Metadados só no drawer; corpo em 100% da largura.
- [ ] `users`, `roles`, `permissions`, `tenants` abrem sem erro e sem mudança de contrato.
- [ ] 375px: 1 coluna, sem scroll horizontal.
- [ ] Dark mode correto (só tokens).
- [ ] `npx tsc --noEmit && npm run lint && npm run build` no frontend.

## 10. Como verificar visualmente

Ao fim de cada etapa: subir o front, abrir a rota com Playwright em 1440×900 e 375×812,
salvar screenshot em `.claude/screenshots/<etapa>.png`, abrir a referência e o screenshot,
e listar o que ainda diverge **antes** de declarar a etapa pronta.
