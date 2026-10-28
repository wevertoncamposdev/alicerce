# Fase 7 — RelationShell

**Mapeamento:** `RelationShell` (seu termo) = `RelationListHost` + `DetailRelationTablePanel` (projeto real).

## 0. Passo 0 — Pré-requisito: `favorites` não tem nenhuma relação

Igual aconteceu na Fase 6 com `entityId`, achei um problema de escopo antes de escrever qualquer linha de UI: **hoje `Favorite` não tem nenhum filho** (`id/title/url/createdAt/user/tenant` — nada um-pra-muitos). `RelationShell` existe pra exibir e gerenciar uma lista de registros relacionados dentro do detalhe de outro registro — sem uma relação real, eu estaria construindo UI para dado que não existe, o que já vimos que não vale a pena (mesmo racional da Fase 6).

Vou propor a menor relação possível que ainda ensina o padrão de verdade: **notas por favorito** (`FavoriteNote` — um-para-muitos simples, sem campos demais).

### 0.1 Schema — `backend/prisma/models/features/favorite.prisma`

```prisma
model Favorite {
    id        String   @id @default(uuid(7)) @db.Uuid
    tenantId  String   @db.Uuid
    title     String
    url       String
    createdAt DateTime @default(now())

    userId String @db.Uuid
    user   User   @relation(fields: [userId], references: [id])
    tenant Tenant @relation(fields: [tenantId], references: [id])

    notes FavoriteNote[]   // <- nova relação

    @@index([tenantId])
    @@index([userId])
    @@map("favorites")
}

model FavoriteNote {
    id         String   @id @default(uuid(7)) @db.Uuid
    tenantId   String   @db.Uuid
    favoriteId String   @db.Uuid
    userId     String   @db.Uuid
    content    String
    createdAt  DateTime @default(now())

    favorite Favorite @relation(fields: [favoriteId], references: [id], onDelete: Cascade)
    user     User     @relation(fields: [userId], references: [id])
    tenant   Tenant   @relation(fields: [tenantId], references: [id])

    @@index([favoriteId])
    @@map("favorite_notes")
}
```

`onDelete: Cascade` em `favoriteId` é proposital: se o favorito for apagado, as notas dele não devem virar registro órfão no banco.

Roda a migration:

```powershell
npx prisma migrate dev --name add_favorite_notes
```

### 0.2 Backend — módulo `favorite-notes` (aninhado sob `favorites`)

```
backend/src/modules/favorites/notes/
  favorite-notes.controller.ts
  favorite-notes.service.ts
  dto/create-favorite-note.dto.ts
```

```ts
// dto/create-favorite-note.dto.ts
import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteNoteDto {
    @ApiProperty({ example: 'Ver esse vídeo de novo com calma' })
    @IsString()
    @MaxLength(1000)
    content!: string;
}
```

```ts
// favorite-notes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/core/prisma/prisma.service';
import { CreateFavoriteNoteDto } from './dto/create-favorite-note.dto';

@Injectable()
export class FavoriteNotesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(favoriteId: string, tenantId: string) {
        return this.prisma.favoriteNote.findMany({
            where: { favoriteId, tenantId },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, email: true } } },
        });
    }

    async create(favoriteId: string, dto: CreateFavoriteNoteDto, tenantId: string, userSub: string) {
        return this.prisma.favoriteNote.create({
            data: {
                content: dto.content,
                favoriteId,
                tenantId,
                userId: userSub,
            },
            include: { user: { select: { id: true, email: true } } },
        });
    }

    async remove(id: string, tenantId: string) {
        const note = await this.prisma.favoriteNote.findUnique({ where: { id } });
        if (!note || note.tenantId !== tenantId) {
            throw new Error('Nota não encontrada ou acesso negado');
        }
        return this.prisma.favoriteNote.delete({ where: { id } });
    }
}
```

```ts
// favorite-notes.controller.ts
import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '@core/common/decorators/tenant-id.decorator';
import { CurrentUserId } from '@core/common/decorators/current-user-id.decorator';
import { FavoriteNotesService } from './favorite-notes.service';
import { CreateFavoriteNoteDto } from './dto/create-favorite-note.dto';

@ApiTags('favorite-notes')
@ApiBearerAuth()
@Controller('favorites/:favoriteId/notes')
export class FavoriteNotesController {
    constructor(private readonly notesService: FavoriteNotesService) {}

    @Get()
    @ApiOperation({ summary: 'Listar notas de um favorito' })
    findAll(@Param('favoriteId') favoriteId: string, @TenantId() tenantId: string) {
        return this.notesService.findAll(favoriteId, tenantId);
    }

    @Post()
    @ApiOperation({ summary: 'Criar nota em um favorito' })
    create(
        @Param('favoriteId') favoriteId: string,
        @Body() dto: CreateFavoriteNoteDto,
        @TenantId() tenantId: string,
        @CurrentUserId() userSub: string,
    ) {
        return this.notesService.create(favoriteId, dto, tenantId, userSub);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover nota' })
    remove(@Param('id') id: string, @TenantId() tenantId: string) {
        return this.notesService.remove(id, tenantId);
    }
}
```

Registra no `favorites.module.ts`:

```ts
@Module({
  controllers: [FavoritesController, FavoriteNotesController],
  providers: [FavoritesService, FavoriteNotesService],
})
export class FavoritesModule {}
```

Não precisa mexer no `app.module.ts` — `FavoriteNotesModule` está dentro do mesmo `FavoritesModule` já registrado.

> Reparem que a rota é `favorites/:favoriteId/notes` — segue o mesmo padrão do controller de `favorites` (sem prefixo `tenant/:tenantId/`, resolve tenant só via `@TenantId()`/header), consistente com o que já existe, não com o padrão do `audit` que corrigimos na Fase 6.

---

## 1. Conceito

O `RelationListHost` de referência é bem mais sofisticado do que precisamos agora — ele integra busca por texto, **domain** (sistema de condições tipo `AdvancedFilterBuilder`, que é `PainelSearchShell` no seu vocabulário e **ainda não construímos**), `groupBy`, sugestões de valor por campo, etc. Isso tudo existe porque no `system_development` uma relação pode ter centenas de linhas (ex: itens de um pedido).

No nosso caso (`notes` de um `favorite`), a lista tende a ser pequena. Construir o `AdvancedFilterBuilder` inteiro pra isso seria puxar uma dependência (Fase 3/`PainelSearchShell`) que nem foi implementada ainda, só pra um caso de uso que não precisa. **Decisão de escopo:** entrego a mesma composição estrutural (`RelationListHost` = busca + botão de adicionar; `RelationTablePanel` = host + tabela), mas com busca **client-side simples** (filtro de texto puro), sem `domain`/`groupBy`/`SearchPanelMenu`. Quando a Fase 3 (`PainelSearchShell`) for reaproveitada aqui no futuro, é só trocar a barra de busca — a composição não muda.

## 2. Tecnologias envolvidas

| Peça | Papel |
|---|---|
| TanStack Table (já usado no `ListView`, Fase 2) | renderiza a tabela de notas — reaproveito o padrão, não o componente (o `ListView` navega pra `/detail/:id` no clique da linha, que não faz sentido aqui) |
| Server Action (`'use server'`) | criar/remover nota — mesmo padrão de `autoSaveRecord` da Fase 5 |
| `useTransition` | disparo assíncrono das ações sem bloquear a UI |
| Estado local (`useState`) no `RelationTablePanel` | a lista de notas vive no client depois do carregamento inicial (evita full-page reload a cada nota criada/removida) |

## 3. Decisões de design (com justificativa)

### 3.1 — `RelationShell` recebe os dados já carregados, não busca sozinho

Mesmo princípio do `MetaDataShell` (Fase 6, decisão 4.1): quem busca é o Server Component pai (`[id]/page.tsx`), que já tem `favorite.id` disponível. O componente cliente só recebe `notes: FavoriteNote[]` como estado inicial e depois gerencia adições/remoções localmente — sem duplicar a busca de dados.

### 3.2 — Estado local depois do load inicial, sem `revalidatePath`

Mesma decisão 3.4 da Fase 5: criar/remover uma nota não deveria forçar o Server Component pai a re-renderizar (perderia o estado do `Drawer`/`MetaDataShell` aberto, por exemplo). O `RelationTablePanel` recebe `initialNotes` só pra hidratar o primeiro render, e depois mantém sua própria cópia em `useState`, atualizada localmente a partir da resposta da Server Action — sem round-trip pro servidor buscar a lista de novo.

### 3.3 — Sem edição inline de nota, só criar/remover

`FormFieldConfig` (Fase 5) foi desenhado pra campos editáveis com autosave. Notas, no nosso domínio, fazem mais sentido como **criar novo** ou **apagar** — editar uma nota existente é um caso de uso que não pedimos e que abriria escopo novo (autosave por linha de tabela). Não implementei; fica registrado como extensão possível, não esquecida.

### 3.4 — Onde o `RelationShell` fica na página: fora do `MetaDataSidebar`

Dava pra meter as notas como mais uma aba do `MetaDataShell` (Fase 6) — de fato, deixei um slot reservado pra isso (`comments?`/`notes?` no `MetaDataShellProps`). Mas resolvi colocar como uma seção separada, abaixo do `FormView`, na área principal da página — porque **notas em geral pedem mais espaço horizontal** (texto livre, criado por diferentes pessoas) do que cabe num drawer de 380px. É uma decisão de UX, não técnica: dá pra mudar de posição sem tocar no componente em si, já que `RelationShell` não sabe onde está montado.

## 4. Código completo

### 4.1 `modules/favorites/types.ts` — tipo da nota

```ts
export type FavoriteNote = {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; email: string };
};
```

### 4.2 `modules/favorites/config/notes-provider.ts` (novo) — REST + Server Actions

```ts
'use server';

import { apiServer } from "@lib/api-server";
import type { FavoriteNote } from "@modules/favorites/types";

export async function listFavoriteNotes(favoriteId: string): Promise<FavoriteNote[]> {
    return apiServer.get<FavoriteNote[]>(`favorites/${favoriteId}/notes`);
}

export async function createFavoriteNote(favoriteId: string, content: string): Promise<FavoriteNote> {
    return apiServer.post<FavoriteNote>(`favorites/${favoriteId}/notes`, { content });
}

export async function deleteFavoriteNote(favoriteId: string, noteId: string): Promise<void> {
    await apiServer.delete(`favorites/${favoriteId}/notes/${noteId}`);
}
```

> Coloquei `'use server'` no arquivo inteiro porque as três funções são chamadas direto do client (`RelationTablePanel`). `listFavoriteNotes` também é chamada do Server Component (`[id]/page.tsx`) pro carregamento inicial — funciona nos dois contextos, já que uma Server Action pode ser chamada tanto de Server quanto de Client Components.

### 4.3 `components/shells/RelationShell/RelationListHost.tsx` (novo) — busca + botão adicionar

```tsx
'use client';

import * as React from "react";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Plus } from "lucide-react";

type RelationListHostProps = {
    searchText: string;
    onSearchTextChange: (next: string) => void;
    searchPlaceholder?: string;
    filteredCount: number;
    addLabel?: string;
    onAdd: () => void;
    children: React.ReactNode;
};

export function RelationListHost({
    searchText,
    onSearchTextChange,
    searchPlaceholder = "Pesquisar",
    filteredCount,
    addLabel = "Adicionar",
    onAdd,
    children,
}: RelationListHostProps) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-3">
                <Input
                    value={searchText}
                    onChange={(e) => onSearchTextChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="max-w-xs"
                />
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                    {filteredCount}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={onAdd} className="ml-auto gap-1">
                    <Plus className="size-3.5" />
                    {addLabel}
                </Button>
            </div>
            {children}
        </section>
    );
}
```

### 4.4 `components/shells/RelationShell/RelationTablePanel.tsx` (novo) — host + tabela + criar/remover

```tsx
'use client';

import * as React from "react";
import { useTransition } from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/ui/table";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Trash2 } from "lucide-react";
import { RelationListHost } from "./RelationListHost";
import { createFavoriteNote, deleteFavoriteNote } from "@modules/favorites/config/notes-provider";
import type { FavoriteNote } from "@modules/favorites/types";

type RelationTablePanelProps = {
    favoriteId: string;
    initialNotes: FavoriteNote[];
};

const columns: ColumnDef<FavoriteNote>[] = [
    { accessorKey: "content", header: "Nota" },
    { accessorKey: "user.email", header: "Autor", cell: ({ row }) => row.original.user.email },
    {
        accessorKey: "createdAt",
        header: "Criado em",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString("pt-BR"),
    },
];

export function RelationTablePanel({ favoriteId, initialNotes }: RelationTablePanelProps) {
    const [notes, setNotes] = React.useState<FavoriteNote[]>(initialNotes);
    const [searchText, setSearchText] = React.useState("");
    const [newNoteText, setNewNoteText] = React.useState("");
    const [isAdding, setIsAdding] = React.useState(false);
    const [isPending, startTransition] = useTransition();

    const filteredNotes = React.useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return notes;
        return notes.filter((note) => note.content.toLowerCase().includes(query));
    }, [notes, searchText]);

    const tableColumns = React.useMemo<ColumnDef<FavoriteNote>[]>(
        () => [
            ...columns,
            {
                id: "actions",
                header: "",
                cell: ({ row }) => (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remover nota"
                        onClick={() => handleDelete(row.original.id)}
                    >
                        <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                ),
            },
        ],
        [notes],
    );

    const table = useReactTable({
        data: filteredNotes,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    function handleDelete(noteId: string) {
        const previous = notes;
        setNotes((current) => current.filter((n) => n.id !== noteId)); // otimista

        startTransition(async () => {
            try {
                await deleteFavoriteNote(favoriteId, noteId);
            } catch (err) {
                console.error("[relation-shell] falha ao remover nota", err);
                setNotes(previous); // reverte se der erro
            }
        });
    }

    function handleCreate() {
        const content = newNoteText.trim();
        if (!content) return;

        startTransition(async () => {
            try {
                const created = await createFavoriteNote(favoriteId, content);
                setNotes((current) => [created, ...current]);
                setNewNoteText("");
                setIsAdding(false);
            } catch (err) {
                console.error("[relation-shell] falha ao criar nota", err);
            }
        });
    }

    return (
        <RelationListHost
            searchText={searchText}
            onSearchTextChange={setSearchText}
            searchPlaceholder="Pesquisar notas"
            filteredCount={filteredNotes.length}
            addLabel="Nova nota"
            onAdd={() => setIsAdding(true)}
        >
            {isAdding ? (
                <div className="flex items-center gap-2 rounded-md border p-2">
                    <Input
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Escreva uma nota..."
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />
                    <Button type="button" size="sm" onClick={handleCreate} disabled={isPending}>
                        Salvar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                        Cancelar
                    </Button>
                </div>
            ) : null}

            {filteredNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                    Nenhuma nota encontrada.
                </p>
            ) : (
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </RelationListHost>
    );
}
```

Ponto de atenção na implementação: **update otimista** em `handleDelete` (remove da UI antes da resposta do servidor, reverte se falhar) — diferente do autosave da Fase 5, que espera confirmação antes de mudar o status. A diferença faz sentido aqui: apagar uma linha de tabela é uma ação discreta e de baixo risco de conflito (não é um campo sendo editado em tempo real), então o ganho de responsividade compensa. Em `handleCreate`, não fiz otimista (esperei a resposta) porque preciso do `id` real gerado pelo backend antes de colocar a linha na tabela (a `key` do React e o botão de deletar dependem dele).

### 4.5 `app/(app)/favorites/[id]/page.tsx` — adiciona a seção de notas

```tsx
import { listFavoriteNotes } from "@modules/favorites/config/notes-provider";
import { RelationTablePanel } from "@components/shells/RelationShell/RelationTablePanel";

// ...dentro do Server Component, depois de buscar favorite/auditTrail:

const notes = await listFavoriteNotes(favorite.id);

// ...no JSX, dentro do AutoSaveStatusProvider, abaixo do FormView:

<FormView<FavoriteEntity>
    mode="edit"
    model="favorites"
    recordId={favorite.id}
    fields={favoritesModule.formFields}
    initialValues={favorite}
/>

<div className="mt-6">
    <h2 className="text-sm font-medium text-muted-foreground mb-2">Notas</h2>
    <RelationTablePanel favoriteId={favorite.id} initialNotes={notes} />
</div>

<MetaDataSidebar>
    <MetaDataShell contextItems={contextItems} auditItems={auditItems} />
</MetaDataSidebar>
```

---

## 5. Testes práticos com checkpoints

**Pré-requisito:** rodar a migration (`npx prisma migrate dev --name add_favorite_notes`) e reiniciar o NestJS.

**Checkpoint 1 — Lista vazia**
Abre `/favorites/[id]` de um favorito sem notas. Deve aparecer "Nenhuma nota encontrada." e o contador em `0`.

**Checkpoint 2 — Criar nota**
Clica "Nova nota", digita algo, aperta Enter (ou clica "Salvar"). A nota deve aparecer no topo da tabela, com seu email como autor e a data atual. Confirma no Network tab: `POST /favorites/:id/notes`, sem `revalidatePath`/reload de página.

**Checkpoint 3 — Busca client-side**
Cria 2-3 notas com textos diferentes. Digita um trecho de uma delas na busca — só ela deve aparecer na tabela, e o contador deve refletir isso. Isso é 100% local (sem request de rede).

**Checkpoint 4 — Remover com reversão em erro**
Remove uma nota (deve sumir da tabela imediatamente — otimista). Derruba o backend, tenta remover outra: ela deve sumir e **voltar** depois do erro (a reversão do `catch`).

**Checkpoint 5 — Isolamento por favorito**
Cria um segundo favorito, cria uma nota nele. Volta pro primeiro favorito — as notas dele continuam intactas e não misturam com as do segundo (`favoriteId` + `tenantId` filtrando certinho no backend).

---

Quando fechar os checkpoints, aviso de novo o mesmo lembrete de sempre: essa é a hora de rodar a avaliação de 6 perguntas cobrindo Fases 5, 6 e 7 juntas, antes de entrarmos na Fase 8 (DetailShellEngine — a composição final de tudo que construímos até aqui).
