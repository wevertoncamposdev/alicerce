# ⚠️ Antes de começar — um aviso sobre a ordem

Combinamos que cada fase fecha com checkpoints validados antes de seguir. Vou elaborar a Fase 6 como pediu, mas ela **depende de dado real de auditoria por registro**, e descobri que o backend hoje não suporta isso (detalho abaixo). Ou seja: mesmo lendo a Fase 6 agora, você só vai conseguir *rodar* os checkpoints dela depois de validar a Fase 5 **e** aplicar um ajuste pequeno no backend. Deixei isso como "Passo 0" da própria fase, igual fizemos na Fase 5.Confirmado: a coluna `entityId` existe no `schema.prisma` (`backend/prisma/models/features/person.prisma`), mas **nunca é preenchida** — nem o `AuditInterceptor` nem o `AuditService.register` a usam. E o `AuditController.findAll` não filtra por `entity`/`entityId` — devolve **todo** o histórico do tenant. Sem isso, não existe como montar uma aba "Auditoria" por registro individual (o MetaDataShell de referência depende disso).

---

# Fase 6 — MetaDataShell

**Mapeamento:** `MetaDataShell` (seu termo) = `StandardDetailMetadataSide` (projeto real).

## 0. Passo 0 — Ajuste mínimo no backend (pré-requisito)

Vou manter o *blast radius* pequeno: só aditivo, nada que quebre o que já funciona.

### 0.1 `audit.service.ts` — aceitar e persistir `entityId`, e permitir filtrar

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';

interface RegisterAuditInput {
  tenantId?: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  payload?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async register({ tenantId, userId, action, entity, entityId, payload }: RegisterAuditInput) {
    if (!tenantId || !userId) {
      return;
    }

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        type: 'DATA_CHANGE',
        action,
        entity,
        entityId,
        before: null,
        after: JSON.stringify(payload),
      },
    });
  }

  async findAll(tenantId: string, filters?: { entity?: string; entityId?: string }) {
    return this.prisma.audit.findMany({
      where: {
        tenantId,
        ...(filters?.entity ? { entity: filters.entity } : {}),
        ...(filters?.entityId ? { entityId: filters.entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### 0.2 `audit.interceptor.ts` — extrair `entityId` de `req.params.id` e normalizar `entity`

Hoje `entity` guarda a URL inteira (`/tenant/xxx/favorites/abc`), o que mistura tenant + recurso + id numa string só — ruim pra filtrar. Vou separar: `entity` passa a ser só o nome do recurso (ex: `favorites`), e `entityId` guarda o id isoladamente.

```ts
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const tenantId = req.tenantId;
    const method = req.method;
    const url = req.originalUrl;
    const body = req.body;
    const routeId = req.params?.id as string | undefined;

    return next.handle().pipe(
      tap((result) => {
        if (!['POST', 'PATCH', 'DELETE'].includes(method) && !url.includes('login')) {
          return;
        }

        const resolvedTenantId =
          tenantId ?? user?.tenantId ?? result?.tenant?.id ?? result?.user?.tenantId;
        const resolvedUserId = user?.id ?? user?.sub ?? result?.user?.id;

        // Extrai o nome do recurso a partir da URL, sem o prefixo /tenant/:id
        // e sem o id do registro (ex: "/tenant/abc/favorites/123" -> "favorites")
        const resourceMatch = url.match(/\/tenant\/[^/]+\/([^/?]+)/);
        const resource = resourceMatch?.[1] ?? url;

        void this.auditService
          .register({
            tenantId: resolvedTenantId,
            userId: resolvedUserId,
            action: method,
            entity: resource,
            entityId: routeId ?? (result?.id as string | undefined),
            payload: this.sanitizePayload(body),
          })
          .catch(() => {
            // Auditoria não deve interromper o request principal.
          });
      }),
    );
  }
```

Note o fallback `result?.id` no `POST` (create): não há `routeId` na criação, mas a resposta do `create()` já retorna o registro criado com `id` — assim até o audit do `POST` fica rastreável pelo mesmo registro.

### 0.3 `audit.controller.ts` — aceitar filtros via query string

```ts
@Controller('tenant/:tenantId/audit')
@UseGuards(TenantScopeGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async findAll(
    @TenantId() tenantId: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.auditService.findAll(tenantId, { entity, entityId });
  }
}
```

### 0.4 Migration

Como `entityId` já existia no schema (só não era usado), **não precisa de migration nova** — é só passar a preencher a coluna que já existe.

⚠️ **Limitação que fica registrada:** registros de audit criados *antes* desse ajuste vão continuar com `entityId = null` e `entity` = URL completa antiga. Não vou migrar dados históricos (fora de escopo) — só documentar que a aba "Auditoria" só mostra eventos a partir de agora.

---

## 1. Conceito

`MetaDataShell` é o painel lateral do `DetailShell` (que ainda não construímos — isso é a Fase 8) — mas ele é **desacoplável**: pode ser montado e testado isoladamente dentro da própria página `[id]/page.tsx`, do lado do `FormView` da Fase 5. Ele organiza, em abas, informações que **não são o formulário principal**: contexto (metadados do registro), histórico de auditoria, e — no projeto de referência — comentários, notas, tags e anexos.

O projeto real usa `DetailSideTabs` (abas com scroll horizontal) + um `content: ReactNode` por aba, montado dinamicamente conforme quais props foram passadas (se você não passar `comments`, a aba nem aparece).

## 2. Escopo desta fase (decisão de design importante)

O `StandardDetailMetadataSide` de referência tem **7 possíveis abas**: Auditoria, Comentários, Notas, Tags, Anexos, Histórico, Contexto. Seis delas dependem de infraestrutura de backend que o `study` **não tem** (endpoints de comentários, notas, tags, upload de anexos).

Implementar todas agora seria construir UI para dados que não existem — o oposto do que estamos fazendo (aprender construindo em cima do real). Então a Fase 6 entrega:

- ✅ **Aba "Contexto"** — metadados do próprio registro (`id`, `createdAt`, `tenantId`) — dado que já existe, sem backend novo.
- ✅ **Aba "Auditoria"** — trilha de auditoria do registro, usando o ajuste do Passo 0.
- 🔲 **Comentários / Notas / Tags / Anexos / Histórico** — meu componente já nasce com a mesma assinatura de props opcionais do original (`comments?`, `notes?`, `tags?`...). Se você não passar a prop, a aba simplesmente não aparece — **sem precisar reescrever o `MetaDataShell` quando o backend crescer**. Isso é o mesmo padrão de extensibilidade do projeto de referência, só que hoje só "ligamos" duas das sete abas.

Essa é a decisão central da fase: **construir a casca genérica inteira, mas cablear (`wire`) só o que tem dado real por trás.**

## 3. Tecnologias envolvidas

| Peça | Papel |
|---|---|
| Radix Tabs (via seu `components/ui`) | abas acessíveis — se ainda não existir `tabs.tsx` no seu `components/ui`, instalamos via shadcn |
| Server Component (`page.tsx`) | busca os dados de contexto + auditoria via `apiServer`, direto (sem Route Handler — mesma regra da Fase 5) |
| `DataProvider` | **não** usamos aqui para auditoria — motivo na decisão 4.3 |

## 4. Decisões de design (com justificativa)

### 4.1 — `MetaDataShell` é "burro": recebe dados prontos, não busca nada

Assim como o `StandardDetailMetadataSide` de referência, o componente recebe `contextItems` e `auditItems` já resolvidos via props — ele não sabe fazer fetch. Quem busca é o Server Component pai (`[id]/page.tsx`). Isso mantém a mesma fronteira que já usamos desde a Fase 1: Server Component busca, Client Component renderiza e reage a interação.

### 4.2 — Abas aparecem/somem conforme a prop existe (não conforme uma flag booleana)

Poderia ter feito `showComments: boolean`. Não fiz — segui o padrão da referência de checar a **presença do objeto de dados** (`comments && !comments.hidden`). Isso evita o estado inconsistente de "showComments true mas comments undefined", que quebraria em runtime. É um único ponto de verdade: se você tem o quê mostrar, mostra.

### 4.3 — Auditoria: `entity`/`entityId` não passam pelo `DataProvider`/Registry

O `DataProvider` da Fase 1 modela CRUD de **um** recurso (`search/read/create/update/delete` de `favorites`). Auditoria é uma consulta *transversal* — filtra por `entity` (nome do recurso) e `entityId`, mas o endpoint em si (`/tenant/:id/audit`) não é o mesmo recurso `favorites`. Forçar isso dentro do contrato `RecordModuleDefinition` misturaria dois conceitos (CRUD de negócio vs trilha de auditoria). Por isso criamos uma função de leitura separada, fora do Registry — mas ainda seguindo a mesma regra da Fase 1 (chamada direta de Server Component via `apiServer`, sem Route Handler).

### 4.4 — Por que não usar `defaultTab` calculado, e sim fixo em `"context"`

No real, `defaultTab` prioriza "activity" (auditoria) — faz sentido lá porque o board é colaborativo (várias pessoas mexendo). Pra `favorites`, que é de uso pessoal, o dado mais útil de abrir primeiro é o contexto básico do próprio registro. Pequena adaptação ao domínio, mesma arquitetura.

---

## 5. Código completo

### 5.1 `lib/api-server.ts` — nova função de leitura de auditoria (verifique se seu `apiServer` já expõe um `.get` genérico; se sim, é só isso)

```ts
// lib/data-provider/rest/audit.ts (novo arquivo — não é um "data provider" formal, ver decisão 4.3)
import 'server-only';
import { apiServer } from '@lib/api-server';

export type AuditEntry = {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    before: string | null;
    after: string | null;
    createdAt: string;
    userId: string;
};

export async function getEntityAuditTrail(entity: string, entityId: string): Promise<AuditEntry[]> {
    return apiServer.get<AuditEntry[]>('audit', {
        query: { entity, entityId },
        cache: 'no-store',
    });
}
```

> Se seu `apiServer.get` não aceita `query` como segundo parâmetro, me mostra a assinatura dele que eu ajusto — não tenho como confirmar isso sem ver o arquivo real, então tratei como suposição aqui. **Assunção marcada explicitamente.**

### 5.2 `components/shells/MetaDataShell/types.ts` (novo)

```ts
export type ContextItem = {
    key: string;
    label: string;
    value: string;
};

export type AuditFeedItem = {
    id: string;
    action: string;
    createdAt: string;
    userId: string;
    summary: string;
};
```

### 5.3 `components/shells/MetaDataShell/AuditPanel.tsx` (novo)

```tsx
import type { AuditFeedItem } from "./types";

function actionLabel(action: string) {
    switch (action) {
        case "POST": return "Criado";
        case "PATCH": return "Atualizado";
        case "DELETE": return "Removido";
        default: return action;
    }
}

export function AuditPanel({ items }: { items: AuditFeedItem[] }) {
    if (!items.length) {
        return <div className="text-sm text-muted-foreground">Nenhum evento de auditoria registrado.</div>;
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <article key={item.id} className="space-y-1 border-b border-border/50 pb-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-foreground">{actionLabel(item.action)}</span>
                        <span className="text-[11px] text-muted-foreground">
                            {item.createdAt.slice(0, 16).replace("T", ", ")}
                        </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{item.summary}</div>
                </article>
            ))}
        </div>
    );
}
```

### 5.4 `components/shells/MetaDataShell/ContextPanel.tsx` (novo)

```tsx
import type { ContextItem } from "./types";

export function ContextPanel({ items }: { items: ContextItem[] }) {
    if (!items.length) {
        return <div className="text-sm text-muted-foreground">Nenhum contexto disponível.</div>;
    }

    return (
        <div className="space-y-3 text-sm">
            {items.map((item, index) => (
                <div
                    key={item.key}
                    className={
                        index === items.length - 1
                            ? "flex items-center justify-between gap-3"
                            : "flex items-center justify-between gap-3 border-b border-border/50 pb-3"
                    }
                >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="text-right text-foreground">{item.value}</span>
                </div>
            ))}
        </div>
    );
}
```

### 5.5 `components/shells/MetaDataShell/index.tsx` (novo) — a casca com abas dinâmicas

```tsx
'use client';

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { ContextPanel } from "./ContextPanel";
import { AuditPanel } from "./AuditPanel";
import type { AuditFeedItem, ContextItem } from "./types";

type MetaDataShellProps = {
    contextItems: ContextItem[];
    auditItems?: AuditFeedItem[];
    defaultTab?: string;
    // Preparado para o futuro — hoje sempre undefined/omitido:
    comments?: { items: unknown[] };
    notes?: { value: string | null };
    tags?: { value: string[] };
    attachments?: { items: unknown[] };
};

export function MetaDataShell({
    contextItems,
    auditItems,
    defaultTab = "context",
    comments,
    notes,
    tags,
    attachments,
}: MetaDataShellProps) {
    const tabs = React.useMemo(() => {
        const list: { value: string; label: string; badge?: number; content: React.ReactNode }[] = [
            { value: "context", label: "Contexto", content: <ContextPanel items={contextItems} /> },
        ];

        if (auditItems) {
            list.push({
                value: "activity",
                label: "Auditoria",
                badge: auditItems.length || undefined,
                content: <AuditPanel items={auditItems} />,
            });
        }

        // comments / notes / tags / attachments: abas reservadas, ainda sem
        // dado real por trás (ver Fase 6, seção 2 — escopo). Quando o
        // backend correspondente existir, basta passar a prop aqui.
        void comments;
        void notes;
        void tags;
        void attachments;

        return list;
    }, [contextItems, auditItems, comments, notes, tags, attachments]);

    return (
        <Tabs defaultValue={defaultTab} className="flex h-full min-h-0 flex-col">
            <TabsList className="border-b border-border/60">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        {tab.label}
                        {tab.badge ? (
                            <span className="ml-2 text-[11px] font-medium tabular-nums text-muted-foreground">
                                {tab.badge}
                            </span>
                        ) : null}
                    </TabsTrigger>
                ))}
            </TabsList>

            {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-4 min-h-0 flex-1 overflow-y-auto">
                    {tab.content}
                </TabsContent>
            ))}
        </Tabs>
    );
}
```

> Simplifiquei o `DetailSideTabs` de referência: removi o scroll horizontal com setas (`ChevronLeft/Right`) porque com só 2 abas ativas não há overflow para justificar essa complexidade. Se no futuro isso crescer para 5+ abas, é um bom candidato a trazer de volta — deixo registrado como débito consciente, não esquecido.

### 5.6 `app/(app)/favorites/[id]/page.tsx` — integra o `MetaDataShell` ao lado do `FormView`

```tsx
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { getEntityAuditTrail } from "@lib/data-provider/rest/audit";
import { FormView } from "@components/type-view/form-view/FormView";
import { MetaDataShell } from "@components/shells/MetaDataShell";
import type { AuditFeedItem, ContextItem } from "@components/shells/MetaDataShell/types";
import type { FavoriteEntity } from "@modules/favorites/types";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FavoriteDetailPage({ params }: PageProps) {
    const { id } = await params;

    const favoritesModule = getModule<FavoriteEntity>("favorites");
    const dataProvider = createDataProvider();
    const favorite = await dataProvider.read<FavoriteEntity>("favorites", id);
    const auditTrail = await getEntityAuditTrail("favorites", id);

    const contextItems: ContextItem[] = [
        { key: "id", label: "ID", value: favorite.id },
        { key: "createdAt", label: "Criado em", value: favorite.createdAt.slice(0, 16).replace("T", ", ") },
        { key: "tenantId", label: "Tenant", value: favorite.tenantId ?? "—" },
    ];

    const auditItems: AuditFeedItem[] = auditTrail.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        userId: entry.userId,
        summary: entry.action === "PATCH" ? "Campos atualizados" : "Registro criado",
    }));

    return (
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-4">
                    Detalhes do Favorito: {favorite.title}
                </h1>
                <FormView
                    mode="edit"
                    model="favorites"
                    recordId={favorite.id}
                    fields={favoritesModule.formFields}
                    initialValues={favorite}
                />
            </div>
            <div className="border rounded-lg p-4">
                <MetaDataShell contextItems={contextItems} auditItems={auditItems} />
            </div>
        </div>
    );
}
```

---

## 6. Testes práticos com checkpoints

**Pré-requisito:** aplicar o Passo 0 no backend e reiniciar o NestJS (`npm run start:dev`).

**Checkpoint 1 — Aba Contexto**
Acesse `/favorites/[id]`. A aba "Contexto" deve mostrar ID, data de criação e tenant do registro, sem nenhuma requisição extra além do `dataProvider.read`.

**Checkpoint 2 — Auditoria vazia em registro novo**
Crie um favorito novo (Fase 5, modo create). Abra o detalhe dele. A aba "Auditoria" deve mostrar pelo menos 1 evento ("Registro criado") — se aparecer vazia, o `entityId` não está sendo capturado no `POST` (confira o fallback `result?.id` no interceptor).

**Checkpoint 3 — Auditoria após autosave**
No mesmo registro, edite o título no `FormView` (dispara autosave da Fase 5, `PATCH /favorites/:id`). Recarregue a página. A aba "Auditoria" deve ganhar um segundo evento ("Campos atualizados").

**Checkpoint 4 — Isolamento por registro**
Crie um segundo favorito. Confirme que a aba "Auditoria" dele mostra **só** os eventos dele — não os do primeiro. Esse é o teste que valida se `entityId` está de fato filtrando (e não caindo no bug antigo de trazer o tenant inteiro).

**Checkpoint 5 — Abas ausentes não quebram nada**
Sem passar `comments`/`notes`/`tags`/`attachments` nenhuma dessas abas deve aparecer na UI — só "Contexto" e "Auditoria". Confirma visualmente.

---

Quando terminar de validar a Fase 5 (checkpoints 1–5 de lá) e depois esta (Passo 0 + checkpoints 1–5 daqui), me avisa — aí sim fecho a avaliação de 6 perguntas cobrindo as duas fases juntas antes de seguirmos pra Fase 7 (RelationShell).
