# Reestruturação da Feature `favorites` como Padrão Arquitetural

## Contexto e diagnóstico

Hoje a feature `favorites` tem dois problemas principais:

1. **A `page.tsx` é `'use client'`** — ela faz fetch de listagem no browser via `apiClient` (passa por `/api/proxy`), em vez de aproveitar o Server Component para já trazer os dados prontos no SSR.
2. **O `favorites.services.ts` reinventa a roda** — monta o `Authorization` e o `x-tenant-id` manualmente, ignorando o `apiServer` que já faz tudo isso.

O `apiServer` já lê o cookie, monta o Bearer, injeta o `x-tenant-id` e chama o Nest diretamente. O `apiClient` passa pelo `/api/proxy` e é para uso exclusivo de componentes client que precisam fazer chamadas _depois_ da renderização (mutações interativas, re-fetch em resposta a ação do usuário).

---

## Arquitetura proposta para a feature

```
features/favorites/
├── favorite.types.ts          ← tipos compartilhados (sem alteração estrutural)
├── favorite.constants.ts      ← constantes (sem alteração)
│
├── server/                    ← [NOVO] loaders server-side
│   └── favorites.queries.ts   ← getFavorites() usando apiServer
│
├── actions/                   ← Server Actions (mutações)
│   └── favorites.actions.ts   ← create, update, delete — todos usando apiServer
│
└── components/                ← Client Components (só o mínimo interativo)
    ├── FavoritesForm.tsx       ← formulário de criação (mantém useActionState)
    ├── FavoritesList.tsx       ← [NOVO] lista renderizada, com botões de ação
    └── FavoritesDeleteButton.tsx ← [NOVO] botão de delete com optimistic UI
```

```
app/(app)/favorites/
└── page.tsx                   ← [ALTERADO] Server Component — sem 'use client'
```

---

## Divisão Server × Client (por quê cada um)

| Camada                         | Onde roda    | O que faz                                          | Por quê                                                                         |
| ------------------------------ | ------------ | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `page.tsx`                     | **Servidor** | Busca dados com `getFavorites()` e passa via props | Dados chegam prontos no HTML, sem loading spinner, sem token exposto ao browser |
| `server/favorites.queries.ts`  | **Servidor** | Chama `apiServer.get()`                            | `apiServer` já tem token + tenant — zero boilerplate                            |
| `actions/favorites.actions.ts` | **Servidor** | `create`, `update`, `delete` via `apiServer`       | Mutações nunca expõem o token; revalidação via `revalidatePath`                 |
| `FavoritesForm.tsx`            | **Client**   | Formulário com `useActionState`                    | Precisa de interatividade (estado de loading, erro inline)                      |
| `FavoritesList.tsx`            | **Client**   | Lista com botão de editar/deletar                  | Precisa de estado local (ex: item em edição, confirmação de delete)             |

---

## Proposta de implementação

### 1. `favorite.types.ts` — ajuste (typo: `tentantId` → `tenantId`)

```ts
export interface FavoriteEntity {
  id: string;
  url: string;
  title: string;
  tenantId?: string;
  userId?: string;
  createdAt: string;
}

export interface CreateFavoritePayload {
  title: string;
  url: string;
}

export interface UpdateFavoritePayload {
  title?: string;
  url?: string;
}

export type FavoriteActionState = {
  error: string | null;
};
```

---

### 2. `server/favorites.queries.ts` — [NOVO]

```ts
import "server-only";
import { apiServer } from "@/lib/api-server";
import { FavoriteEntity } from "../favorite.types";

export async function getFavorites(): Promise<FavoriteEntity[]> {
  return apiServer.get<FavoriteEntity[]>("favorites");
}
```

> Só isso. Sem token manual, sem `INTERNAL_API_URL`, sem cookie. O `apiServer` cuida de tudo.

---

### 3. `actions/favorites.actions.ts` — reescrito (POST + PUT + DELETE)

```ts
"use server";
import { revalidatePath } from "next/cache";
import { apiServer } from "@/lib/api-server";
import {
  CreateFavoritePayload,
  UpdateFavoritePayload,
  FavoriteActionState,
} from "../favorite.types";

export async function createFavorite(
  _prev: FavoriteActionState,
  formData: FormData,
): Promise<FavoriteActionState> {
  try {
    const payload: CreateFavoritePayload = {
      title: formData.get("title") as string,
      url: formData.get("url") as string,
    };
    await apiServer.post("favorites", payload);
    revalidatePath("/favorites");
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updateFavorite(
  id: string,
  _prev: FavoriteActionState,
  formData: FormData,
): Promise<FavoriteActionState> {
  try {
    const payload: UpdateFavoritePayload = {
      title: formData.get("title") as string,
      url: formData.get("url") as string,
    };
    await apiServer.put(`favorites/${id}`, payload);
    revalidatePath("/favorites");
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteFavorite(id: string): Promise<void> {
  await apiServer.delete(`favorites/${id}`);
  revalidatePath("/favorites");
}
```

> Note o `revalidatePath('/favorites')` — é o que faz o Next.js **rebuscar os dados no servidor** e re-renderizar a página sem precisar de um `reload()` manual no client.

---

### 4. `app/(app)/favorites/page.tsx` — Server Component

```tsx
// SEM 'use client'
import { getFavorites } from "@/features/favorites/server/favorites.queries";
import { FavoritesForm } from "@/features/favorites/components/FavoritesForm";
import { FavoritesList } from "@/features/favorites/components/FavoritesList";

export default async function FavoritesPage() {
  const favorites = await getFavorites();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meus Favoritos</h1>
        <p className="text-muted-foreground">Gerencie seus links salvos</p>
      </div>

      <FavoritesForm />

      <FavoritesList favorites={favorites} />
    </div>
  );
}
```

> A página é `async` e busca dados no servidor. Não tem `useState`, `useEffect`, nem loading spinner inicial.

---

### 5. `components/FavoritesList.tsx` — [NOVO] Client Component

```tsx
"use client";
import { FavoriteEntity } from "../favorite.types";
import { deleteFavorite } from "../actions/favorites.actions";
import { FavoritesDeleteButton } from "./FavoritesDeleteButton";

type Props = { favorites: FavoriteEntity[] };

export function FavoritesList({ favorites }: Props) {
  if (favorites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum favorito ainda.</p>
    );
  }

  return (
    <div className="space-y-3">
      {favorites.map((fav) => (
        <div
          key={fav.id}
          className="p-4 border rounded-lg flex items-start justify-between"
        >
          <div>
            <p className="font-medium">{fav.title}</p>
            <a
              href={fav.url}
              target="_blank"
              className="text-sm text-blue-500 hover:underline break-all"
            >
              {fav.url}
            </a>
          </div>
          <FavoritesDeleteButton id={fav.id} />
        </div>
      ))}
    </div>
  );
}
```

---

## Fluxo de dados completo (depois da mudança)

```
Requisição GET /favorites
  └─► page.tsx (Server Component, async)
        └─► getFavorites()          ← server/favorites.queries.ts
              └─► apiServer.get()   ← lib/api-server.ts
                    └─► fetch() → NestJS API (com Bearer + x-tenant-id)
        └─► renderiza HTML com dados prontos
              ├─► <FavoritesForm />     ← Client Component
              └─► <FavoritesList />     ← Client Component (recebe dados via props)

Ação POST (criar favorito)
  └─► FavoritesForm → useActionState → createFavorite() (Server Action)
        └─► apiServer.post()
              └─► fetch() → NestJS API
        └─► revalidatePath('/favorites')  ← Next rebusca e re-renderiza
```

---

## O que NÃO muda

- `FavoritesForm.tsx` continua com `useActionState` — só troca o import da action
- `apiClient` e `apiServer` em `lib/` não são alterados
- Estrutura de pastas da feature é preservada e **estendida** (pasta `server/` é adicionada)

---

## Arquivos afetados

### [MODIFY] `features/favorites/favorite.types.ts`

Corrige typo `tentantId` → `tenantId` e adiciona `CreateFavoritePayload`, `UpdateFavoritePayload`, `FavoriteActionState`.

### [NEW] `features/favorites/server/favorites.queries.ts`

Loader server-side que usa `apiServer`.

### [MODIFY] `features/favorites/actions/favorites.actions.ts`

Reescreve usando `apiServer`. Adiciona `updateFavorite` e `deleteFavorite`. Remove `getSessionToken` manual.

### [MODIFY] `features/favorites/components/FavoritesForm.tsx`

Atualiza import da action para o novo arquivo.

### [NEW] `features/favorites/components/FavoritesList.tsx`

Lista com botões de ação (delete, futuramente edit).

### [NEW] `features/favorites/components/FavoritesDeleteButton.tsx`

Botão de delete que chama a Server Action `deleteFavorite`.

### [MODIFY] `app/(app)/favorites/page.tsx`

Remove `'use client'`, vira Server Component async, busca dados com `getFavorites()`.

### [DELETE] `features/favorites/services/favorites.services.ts`

Substituído por `server/favorites.queries.ts`. A lógica de mutação vai para as actions.

### [DELETE] `features/favorites/queries.ts`

Unificado em `server/favorites.queries.ts`.

---

## Padrão para features futuras

A mesma estrutura se aplica a qualquer nova feature:

```
features/<nome>/
├── <nome>.types.ts
├── <nome>.constants.ts
├── server/
│   └── <nome>.queries.ts     ← GET server-side com apiServer
├── actions/
│   └── <nome>.actions.ts     ← POST/PUT/DELETE com apiServer + revalidatePath
└── components/
    └── ...                   ← Client Components que recebem dados via props
```

A `page.tsx` é **sempre Server Component async**, sem `'use client'`.

---

## Verificação

- Build sem erros de tipagem (`tsc --noEmit`)
- Página de favoritos carrega sem loading spinner (dados já no HTML)
- Criar favorito atualiza a lista automaticamente (sem `loadFavorites()` manual)
- Token nunca aparece em Network tab do browser
