# Passo 0 — Cleanup pré-Fase 5

## 0.1 Import órfão em `lib/data-provider/rest/favorites.ts`

Estava importando o tipo `Favorite` de `@/features/favorites/favorite.types` (pasta antiga). Troca:

```ts
// lib/data-provider/rest/favorites.ts
import type { Favorite } from "@modules/favorites/types";
```

## 0.2 Excluir as pastas duplicadas

```bash
frontend/src/features/favorites/     ❌ apagar
frontend/src/components/TypeView/    ❌ apagar (o `components/type-view/` kebab-case é o vivo)
```

`features/audit/components/AuditTable.tsx` ainda importa de `components/TypeView` — isso é do módulo `audit`, fora do escopo de `favorites`. Deixo uma nota no final, mas não vou tocar nele agora para não abrir uma frente nova.

## 0.3 Um terceiro achado: `modules/favorites/server/queries.ts` é redundante

Esse arquivo (`getFavorites`/`getFavorite`) faz a **mesma coisa** que `lib/data-provider/rest/favorites.ts` (`searchFavorites`/`readFavorite`) — só que por fora do `DataProvider`, direto no `apiServer`. Isso quebra a garantia da Fase 1 ("UI nunca sabe como o `apiServer` é chamado — só fala com o `DataProvider`").

Como a Fase 5 vai reescrever `[id]/page.tsx`, aproveito para eliminar essa duplicidade: a página passa a usar `createDataProvider().read("favorites", id)`, e `server/queries.ts` é removido.

---

# Fase 5 — FormView + Autosave

## 1. Conceito

No projeto de referência, **FormView = `RecordForm`** — um formulário genérico, dirigido por configuração (`fields: FormFieldConfig[]`), que não conhece `favorites`, `tasks` ou qualquer feature específica. Ele só sabe renderizar campos e emitir dois eventos: `onFieldChange` (a cada tecla) e `onFieldCommit` (quando o valor "assenta" — no nosso caso, `onBlur`).

**Autosave** é o que conecta `onFieldCommit` a uma gravação real, sem o usuário precisar clicar em "Salvar". No `system_development`, isso vive em `useDetailAutoSaveController` (`web-client/detail/`): ele guarda o último draft salvo, compara com o draft atual, e só dispara uma gravação se algo realmente mudou.

A pergunta que este phase responde é: **como acoplamos esse padrão de autosave nas peças que já construímos (DataProvider, Registry/moduleDefinition) sem reinventar a arquitetura**?

## 2. Tecnologias envolvidas

| Peça | Papel |
|---|---|
| `useState` (client) | fonte da verdade dos valores do formulário enquanto o usuário digita |
| Server Action (`'use server'`) | ponte entre o client e o `DataProvider` (que é `server-only`) |
| `useTransition` | dispara a Server Action sem bloquear a UI, sem precisar de `useActionState`/`<form action>` |
| Hook próprio (`useAutoSaveController`) | decide *quando* de fato chamar a Server Action — dedupe, fila, estado de "salvando" |
| `useActionState` (mantido) | continua sendo usado **só no modo create**, que não muda — ver decisão 3.1 |

Note que **não** uso `useActionState` no modo edição. Isso é proposital — decisão 3.1 abaixo.

## 3. Decisões de design (com justificativa)

### 3.1 — Create continua com submit explícito. Edit usa autosave

Autosave grava um registro que **já existe** (tem `id`). Criar um registro novo a cada tecla digitada geraria N registros incompletos no banco (ou exigiria uma lógica de "criar rascunho vazio antes de o usuário digitar", que é bem mais complexa e não está nos requisitos). O padrão do próprio `system_development` reflete isso: o autosave vive em `detail/`, não em telas de criação.

Consequência prática: `FormView` vai ter dois "modos" (`create` e `edit`), com comportamentos internos diferentes, mas a mesma configuração de campos (`formFields`) — reaproveitamento sem forçar os dois fluxos a serem idênticos.

### 3.2 — Trigger de autosave: `field-commit` (blur), não `onChange` nem timer

Três opções possíveis:

- **onChange**: 1 request por tecla — desperdício de rede, race conditions.
- **timer (debounce fixo, ex: 2s)**: imprevisível para o usuário ("será que já salvou?").
- **field-commit (blur)**: o usuário sai do campo → salva. Previsível, sem timer misterioso, e é exatamente o `trigger: "field-commit"` que o `useDetailAutoSaveController` de referência usa por padrão.

Escolhido: **field-commit**.

### 3.3 — A Server Action de autosave passa pelo `DataProvider`, não pelo `apiServer` direto

Hoje, `modules/favorites/actions/actions.ts` chama `apiServer.patch(...)` diretamente — ignorando a abstração da Fase 1. Isso funciona, mas quebra a promessa do `DataProvider`: *qualquer* leitura/escrita deveria poder trocar de transporte (REST → GraphQL, por exemplo) sem a UI ou as actions saberem.

Para a Fase 5, crio uma Server Action **genérica** (não específica de `favorites`) que usa `getModule(model).dataHandlers.update`, reaproveitável por qualquer módulo registrado no futuro (`tasks`, etc.) — é literalmente o ganho que a Fase 4 (Registry) foi desenhada para entregar.

### 3.4 — A Server Action de autosave **não** chama `revalidatePath`

Isso é sutil e importante: `revalidatePath` força o Server Component pai a re-renderizar e re-buscar dados. Se isso acontecer a cada `blur`, o React vai desmontar/remontar a árvore do formulário (ou pelo menos re-sincronizar props), e o usuário pode ver o campo "piscar" ou perder o foco no meio da digitação seguinte.

Como o estado do formulário já vive no client (`useState`) e é ele quem decide o que mostrar, não precisamos que o servidor "avise" a página — o autosave só precisa persistir. Revalidação plena só faz sentido se outra parte da tela depender desse dado (ex: uma lista lateral) — não é o caso aqui.

### 3.5 — Extensão do contrato do módulo: `formFields`

A Fase 4 criou `defineRecordModule`. Agora ele ganha um campo novo, `formFields`, que descreve os campos do formulário de forma declarativa — assim `FormView` nunca precisa saber que `favorites` tem "título" e "url"; ele lê isso do módulo.

---

## 4. Código completo

### 4.1 `lib/registry/types.ts` — adiciona `FormFieldConfig` e `formFields`

```ts
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";

export type RecordModuleDataHandlers<T> = {
    search: (args: SearchArgs) => Promise<SearchResult<T>>;
    read: (id: string) => Promise<T>;
    create: (payload: unknown) => Promise<T>;
    update: (id: string, payload: unknown) => Promise<T>;
    delete: (id: string) => Promise<void>;
};

export type FormFieldConfig<T> = {
    name: keyof T & string;
    label: string;
    type: "text" | "url" | "textarea";
    required?: boolean;
};

export type RecordModuleDefinition<T = unknown> = {
    model: string;
    label: string;
    views: string[];
    defaultView: string;
    dataHandlers: RecordModuleDataHandlers<T>;
    formFields: FormFieldConfig<T>[];
    parseListState: (searchParams: Record<string, string | string[] | undefined>) => SearchArgs;
    serializeListState: (current: URLSearchParams, patch: Record<string, unknown>) => URLSearchParams;
};
```

### 4.2 `modules/favorites/config/contract.ts` — declara os campos

```ts
import { defineRecordModule, registerModule } from "@lib/registry";
import {
    searchFavorites,
    readFavorite,
    createFavorite,
    updateFavorite,
    deleteFavorite,
} from "@lib/data-provider/rest/favorites";
import {
    parseFavoritesListState,
    serializeFavoritesListState,
} from "@lib/query-state/favorites-query-state";
import type { Favorite } from "@modules/favorites/types";

export const favoritesModule = defineRecordModule<Favorite>({
    model: "favorites",
    label: "Favoritos",
    views: ["list", "cards", "graph", "text", "form"],
    defaultView: "list",
    dataHandlers: {
        search: searchFavorites,
        read: readFavorite,
        create: createFavorite,
        update: updateFavorite,
        delete: deleteFavorite,
    },
    formFields: [
        { name: "title", label: "Título", type: "text", required: true },
        { name: "url", label: "URL", type: "url", required: true },
    ],
    parseListState: parseFavoritesListState,
    serializeListState: serializeFavoritesListState,
});

registerModule(favoritesModule);
```

### 4.3 `lib/registry/actions.ts` (novo) — Server Action genérica de autosave

```ts
'use server';

import { createDataProvider } from "@lib/data-provider";

/**
 * Server Action genérica para autosave de campo/registro.
 * Não é específica de "favorites" — qualquer módulo registrado
 * no Registry (Fase 4) pode usá-la, desde que tenha dataHandlers.update.
 *
 * Propositalmente NÃO chama revalidatePath (ver decisão 3.4 da Fase 5):
 * o estado do formulário é local (client), o servidor só precisa persistir.
 */
export async function autoSaveRecord<T>(
    model: string,
    id: string,
    patch: Record<string, unknown>,
): Promise<T> {
    const dataProvider = createDataProvider();
    return dataProvider.update<T>(model, id, patch);
}
```

### 4.4 `hooks/use-autosave-controller.ts` (novo) — versão simplificada da referência

```ts
'use client';

import * as React from "react";

type UseAutoSaveControllerOptions<TDraft extends Record<string, unknown>> = {
    draft: TDraft;
    enabled?: boolean;
    onSave: (draft: TDraft) => Promise<TDraft>;
    onError?: (error: unknown) => void;
};

/**
 * Versão simplificada do useDetailAutoSaveController (system_development/web-client/detail).
 * Removido: suporte a suspensão por upload de mídia (não existe no nosso caso).
 * Mantido: dedupe por comparação de draft, fila enquanto salva, flag de saving.
 */
export function useAutoSaveController<TDraft extends Record<string, unknown>>({
    draft,
    enabled = true,
    onSave,
    onError,
}: UseAutoSaveControllerOptions<TDraft>) {
    const [saving, setSaving] = React.useState(false);
    const draftRef = React.useRef(draft);
    const lastSavedRef = React.useRef<TDraft | null>(null);
    const queuedRef = React.useRef<TDraft | null>(null);
    const savingRef = React.useRef(false);

    React.useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    const commitDraftAsync = React.useCallback(async () => {
        if (!enabled) return;
        const candidate = draftRef.current;

        if (lastSavedRef.current && JSON.stringify(candidate) === JSON.stringify(lastSavedRef.current)) {
            return; // nada mudou desde o último save — evita request redundante
        }

        if (savingRef.current) {
            queuedRef.current = candidate; // já tem um save em voo: enfileira o mais recente
            return;
        }

        savingRef.current = true;
        setSaving(true);
        try {
            const saved = await onSave(candidate);
            lastSavedRef.current = saved;
        } catch (error) {
            onError?.(error);
        } finally {
            savingRef.current = false;
            setSaving(false);

            if (queuedRef.current) {
                const next = queuedRef.current;
                queuedRef.current = null;
                draftRef.current = next;
                void commitDraftAsync();
            }
        }
    }, [enabled, onSave, onError]);

    const commitField = React.useCallback(() => {
        void commitDraftAsync();
    }, [commitDraftAsync]);

    return { saving, commitField };
}
```

### 4.5 `components/type-view/form-view/FormView.tsx` — reescrito (create + edit)

```tsx
'use client';

import * as React from "react";
import { useActionState } from "react";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { useAutoSaveController } from "@hooks/use-autosave-controller";
import { autoSaveRecord } from "@lib/registry/actions";
import type { FormFieldConfig } from "@lib/registry/types";

type ActionState = { ok: boolean; message?: string };

type FormViewProps<T extends Record<string, unknown>> =
    | {
        mode: "create";
        fields: FormFieldConfig<T>[];
        createAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
    }
    | {
        mode: "edit";
        fields: FormFieldConfig<T>[];
        model: string;
        recordId: string;
        initialValues: T;
    };

export function FormView<T extends Record<string, unknown>>(props: FormViewProps<T>) {
    if (props.mode === "create") {
        return <CreateFormView fields={props.fields} action={props.createAction} />;
    }
    return (
        <EditFormView
            fields={props.fields}
            model={props.model}
            recordId={props.recordId}
            initialValues={props.initialValues}
        />
    );
}

function CreateFormView<T extends Record<string, unknown>>({
    fields,
    action,
}: {
    fields: FormFieldConfig<T>[];
    action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
    const [state, formAction, isPending] = useActionState(action, { ok: true, message: "" });

    return (
        <form action={formAction} className="flex flex-col gap-2 mt-4 border p-4 rounded-lg shadow-md">
            {fields.map((field) => (
                <Input key={field.name} name={field.name} placeholder={field.label} required={field.required} />
            ))}
            <Button type="submit" disabled={isPending}>
                {isPending ? "Criando..." : "Criar"}
            </Button>
            {state.message && <p>{state.message}</p>}
        </form>
    );
}

function EditFormView<T extends Record<string, unknown>>({
    fields,
    model,
    recordId,
    initialValues,
}: {
    fields: FormFieldConfig<T>[];
    model: string;
    recordId: string;
    initialValues: T;
}) {
    const [values, setValues] = React.useState<T>(initialValues);
    const [error, setError] = React.useState<string | null>(null);

    const { saving, commitField } = useAutoSaveController<T>({
        draft: values,
        onSave: (draft) => autoSaveRecord<T>(model, recordId, draft),
        onError: (err) => {
            console.error("[autosave]", err);
            setError("Falha ao salvar. Tentando novamente na próxima alteração.");
        },
    });

    function handleChange(name: keyof T & string, value: string) {
        setError(null);
        setValues((prev) => ({ ...prev, [name]: value }));
    }

    return (
        <div className="flex flex-col gap-2 mt-4 border p-4 rounded-lg shadow-md">
            {fields.map((field) => (
                <Input
                    key={field.name}
                    name={field.name}
                    value={(values[field.name] as string) ?? ""}
                    placeholder={field.label}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    onBlur={commitField}
                />
            ))}
            <p className="text-xs text-muted-foreground">
                {saving ? "Salvando..." : error ?? "Salvo"}
            </p>
        </div>
    );
}
```

### 4.6 `app/(app)/favorites/page.tsx` — só a linha do form muda

```tsx
import { FormView } from "@components/type-view/form-view/FormView";
import { createFavorite } from "@modules/favorites/actions/actions";
// ... resto igual

formView={
    <FormView
        mode="create"
        fields={favoritesModule.formFields}
        createAction={createFavorite}
    />
}
```

### 4.7 `app/(app)/favorites/[id]/page.tsx` — reescrito

```tsx
import { getModule } from "@lib/registry";
import { createDataProvider } from "@lib/data-provider";
import { FormView } from "@components/type-view/form-view/FormView";
import type { FavoriteEntity } from "@modules/favorites/types";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FavoriteDetailPage({ params }: PageProps) {
    const { id } = await params;

    const favoritesModule = getModule<FavoriteEntity>("favorites");
    const dataProvider = createDataProvider();
    const favorite = await dataProvider.read<FavoriteEntity>("favorites", id);

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    Detalhes do Favorito: {favorite.title}
                </h1>
            </div>
            <FormView
                mode="edit"
                model="favorites"
                recordId={favorite.id}
                fields={favoritesModule.formFields}
                initialValues={favorite}
            />
        </div>
    );
}
```

Com isso, `modules/favorites/server/queries.ts` e `modules/favorites/components/FavoriteUpdateForm.tsx` ficam sem uso — pode apagar os dois (`FavoritesCreateForm.tsx` também fica redundante, já que `FormView mode="create"` cobre o mesmo papel; sugiro apagar depois de validar o checkpoint 1).

---

## 5. Testes práticos com checkpoints

**Checkpoint 1 — Create ainda funciona**
Acesse `/favorites?view=form`. Preencha título/URL, clique em "Criar". Deve continuar funcionando exatamente como antes (nada mudou nesse fluxo, só trocou de componente).

**Checkpoint 2 — Autosave básico**
Acesse `/favorites/[id]` de um favorito existente. Edite o título, e **saia do campo (clique fora / Tab)**. Observe o texto abaixo mudar para "Salvando..." e depois "Salvo". Dê F5: o novo título deve estar persistido.

**Checkpoint 3 — Dedupe**
No mesmo campo, clique dentro e saia sem alterar nada (blur sem mudança). Abra o Network tab do navegador: **nenhuma** requisição deve ser disparada — é o `JSON.stringify` comparando draft atual com o último salvo.

**Checkpoint 4 — Fila (edições rápidas em campos diferentes)**
Throttle a rede para "Slow 3G" no DevTools. Edite o título e saia do campo (dispara save lento). Antes dele terminar, edite a URL e saia do campo também. Espere: você deve ver só o segundo valor persistido no fim (não dois saves brigando, não perda da segunda edição) — é o `queuedRef`.

**Checkpoint 5 — Falha de rede**
Derrube o backend (`Ctrl+C` no NestJS), edite um campo e saia dele. Deve aparecer a mensagem de erro, e **o valor digitado permanece no input** (não reverte) — o estado local é a fonte da verdade, o servidor é só persistência best-effort até a próxima tentativa.

---

Quando validar os 5 checkpoints, me avisa que eu já preparo a avaliação de 6 perguntas antes de seguirmos pra Fase 6 (MetaDataShell).
