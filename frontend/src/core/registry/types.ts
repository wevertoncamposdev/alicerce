// lib/registry/types.ts
import type { SearchArgs, SearchResult } from "@core/data-provider/types";
import type { ContextItem, AuditFeedItem } from "@core/components/DetailView/MetaDataView/types";
import type { EnumDefinition } from "@core/registry/enum";
import type React from "react";
import type { LucideIcon } from "lucide-react";

export type RecordModuleDataHandlers<T> = {
    search: (args: SearchArgs) => Promise<SearchResult<T>>;
    read: (id: string) => Promise<T>;
    create?: (payload: unknown) => Promise<T>;   // opcional: módulos read-only (ex: audit) não implementam
    update?: (id: string, payload: unknown) => Promise<T>;
    delete?: (id: string) => Promise<void>;
};

export type FormFieldConfig<T> = {
    name: keyof T & string;
    label: string;
    placeholder?: string;
    type:
        | "text" | "email" | "password" | "url" | "number" | "textarea" | "select" | "checkbox" | "switch" | "image"
        // U4 (docs/PLAN-fundacao-ux.md) — tipos novos:
        | "date" | "datetime" | "money"
        | "cpf" | "cnpj" | "document" | "phone" | "cep"
        | "lookup" | "multiselect" | "tags";
    required?: boolean;
    createOnly?: boolean;
    options?: Array<string | { label: string; value: string }>;
    /** Campo que dispara a criação no Detail (`createMode: "detail"`). Um por módulo. */
    primary?: boolean;
    /**
     * Só `type: "image"`: o campo guarda o `fileId` (FK), não a URL — nome
     * do campo do registro que já traz a URL de preview resolvida pelo
     * backend (ver ADR 0010). Precisa ser o NOME do campo, não uma função
     * `(record) => string` — função não serializa na fronteira
     * Server→Client (etapa 12.3, corrige C2); `serializable-contracts.
     * test.ts` cobre essa classe de erro pra todo `formFields`.
     */
    previewField?: keyof T & string;
    /** Só `type: "image"`: metadado repassado ao upload (ex.: "user.avatar"). */
    uploadOwnerType?: string;
    /**
     * U4: quantas colunas (de até 3) o campo ocupa no `FieldGrid` novo —
     * default 1. `textarea` sem `span` declarado assume 3 (linha
     * inteira) direto no `FieldGrid`, não precisa declarar aqui.
     */
    span?: 1 | 2 | 3;
    /** U4: texto de ajuda exibido sob o campo (abaixo do input, acima do erro). */
    help?: string;
    /**
     * Só `type: "document"`: nome do campo irmão (ex.: um `select` com
     * "CPF"/"CNPJ") que decide qual máscara aplicar. Sem isso, o campo
     * não aplica máscara nenhuma (fica texto puro).
     */
    conditionalType?: keyof T & string;
    /**
     * Só `type: "cep"`: nomes dos campos irmãos que recebem o
     * preenchimento automático do ViaCEP ao perder o foco com 8 dígitos.
     * Omitido = sem busca de endereço, só a máscara.
     */
    addressFields?: {
        street?: keyof T & string;
        neighborhood?: keyof T & string;
        city?: keyof T & string;
        state?: keyof T & string;
    };
    /** Só `type: "lookup"`: `model` do módulo buscado (mesmo valor de `RecordModuleDefinition.model`). */
    relatedModel?: string;
    /** Só `type: "lookup"`: campo do registro relacionado mostrado nas opções de busca. */
    relatedLabelField?: string;
    /**
     * Só `type: "lookup"`: campo do registro ATUAL que já traz o nome resolvido do
     * relacionado (ex.: um `mentorId` vem acompanhado de `mentorName`) — mesmo padrão de
     * `previewField` (`type: "image"`): evita um fetch extra no client só pra exibir o
     * valor atual, e evita função no contrato (não serializa Server→Client, etapa 12.3).
     * Sem isso, mostra o id cru.
     */
    relatedTitleField?: keyof T & string;
};

export type DetailContext<T> = {
    record: T;
    contextItems: ContextItem[];
    auditItems: AuditFeedItem[];
};

export type RelationTabConfig = {
    key: string;
    label: string;
    content: React.ReactNode;
    icon?: LucideIcon;
    count?: number;
};

export type DetailHeaderConfig = {
    title: string;
    subtitle?: string[];
    avatar?: { src?: string; fallback: string };
    status?: React.ReactNode;
    contacts?: { icon: LucideIcon; text: string; href?: string }[];
};

export type DetailSection<T> = {
    key: string;
    title: string;
    icon?: LucideIcon;
    column?: 1 | 2 | 3;
    /**
     * Função pra "editável, mas condicionado ao estado do registro" (ex.:
     * seção bloqueada quando `record.isSystem` — ver Plano Base.md 8.3,
     * papéis de sistema). Avaliada por `DetailSections.tsx` a cada render.
     */
    editable?: boolean | ((record: T) => boolean);
    fields?: (keyof T & string)[];
    render?: (ctx: DetailContext<T>) => React.ReactNode;
};

export type DetailTab<T> = {
    key: string;
    label: string;
    icon?: LucideIcon;
    content: (ctx: DetailContext<T>) => React.ReactNode;
};

export type DetailLayout<T> = {
    // NOVO (todos opcionais)
    header?: (ctx: DetailContext<T>) => DetailHeaderConfig;
    sections?: DetailSection<T>[];
    tabs?: DetailTab<T>[];
    /** Ações da tela de detalhe, renderizadas no AppTopbar antes do botão de metadados. */
    toolbar?: (ctx: DetailContext<T>) => React.ReactNode;
    // EXISTENTE — continua funcionando
    main?: (ctx: DetailContext<T>) => React.ReactNode;
    side?: (ctx: DetailContext<T>) => React.ReactNode;
    bottom?: (ctx: DetailContext<T>) => React.ReactNode;
    relations?: (ctx: DetailContext<T>) => RelationTabConfig[] | Promise<RelationTabConfig[]>;
};

// ============================================================
// NOVO — simétrico ao DetailLayout, mas para a tela de listagem
// ============================================================

export type ListContext<T> = {
    data: T[];
    searchArgs: SearchArgs;
    /** Paginação real devolvida pelo servidor — ver SearchResult. */
    pagination: SearchResult<T>["pagination"];
};

/**
 * Cada chave é uma "view" (list, cards, graph, ...) e o valor é uma função
 * pura (ctx) => JSX. O módulo só declara as views que efetivamente suporta;
 * TypeViewScreen usa `views` (a lista de chaves) pra saber quais existem.
 */
export type ListLayout<T> = Partial<Record<string, (ctx: ListContext<T>) => React.ReactNode>>;

// ============================================================
// NOVO (U3) — tipo de coluna declarativo, pra quem optar por ele em vez
// de `ColumnDef<AppTableFeatures,T>[]` cru do TanStack. `core/components/
// Layout/column-builder.tsx` (buildColumns) transforma isso num
// ColumnDef de verdade — ver docs/ui/list-page.md.
// ============================================================

type ColumnConfigBase<T> = { key: keyof T & string; label: string };

export type ColumnConfig<T> =
    | (ColumnConfigBase<T> & { type: "text" })
    | (ColumnConfigBase<T> & {
          type: "title";
          href: (record: T) => string;
          avatar?: { fallback: (record: T) => string; src?: keyof T & string };
          subtitle?: keyof T & string;
      })
    | (ColumnConfigBase<T> & { type: "badge"; enumDef: EnumDefinition<string> })
    | (ColumnConfigBase<T> & { type: "date" | "datetime" })
    | (ColumnConfigBase<T> & { type: "money" })
    | (ColumnConfigBase<T> & { type: "relation"; href: (record: T) => string | null })
    | (ColumnConfigBase<T> & { type: "tags" })
    | (ColumnConfigBase<T> & { type: "count" });

// ============================================================
// NOVO — o que hoje é montado na mão em favorites/[id]/page.tsx
// ============================================================

export type DetailConfig<T> = {
    /** Se true, DetailViewScreen busca a trilha de auditoria automaticamente (REST real). */
    auditEnabled?: boolean;
    /**
     * Constrói os ContextItem[] a partir do record já carregado.
     * Isso é conhecimento de domínio do módulo — não pertence à page.
     */
    loadContext?: (record: T) => ContextItem[] | Promise<ContextItem[]>;
    /**
     * Fornece a trilha de auditoria diretamente (bypassa o REST real) — só pra fixtures sem
     * backend, como `modules/develop/showcase`. Módulo de domínio real usa `auditEnabled`.
     */
    loadAudit?: (record: T) => AuditFeedItem[] | Promise<AuditFeedItem[]>;
};

export type RecordModuleDefinition<T = unknown> = {
    model: string;
    label: string;
    views: string[];
    defaultView: string;
    dataHandlers: RecordModuleDataHandlers<T>;
    formFields: FormFieldConfig<T>[];
    /**
     * Prefixo de permissão usado pelas seções `editable` do detail (vira
     * `${permission}.update`). Default: resolução atual de `${model}.update`
     * via `resolveActionPermission` (lib/authz.ts).
     */
    permission?: string;
    /** "sheet" (default, Sheet de criação) ou "detail" ("Novo" abre o Detail em rascunho). */
    createMode?: "sheet" | "detail";
    parseListState: (searchParams: Record<string, string | string[] | undefined>) => SearchArgs;
    serializeListState: (current: URLSearchParams, patch: Record<string, unknown>) => URLSearchParams;

    /** Slots da tela de listagem — plugado no TypeViewScreen. */
    listLayout: ListLayout<T>;

    /** Slots da tela de detalhe — plugado no DetailViewScreen. */
    detailLayout?: DetailLayout<T>;

    /** Comportamento de borda da tela de detalhe (audit, context). */
    detailConfig?: DetailConfig<T>;
};