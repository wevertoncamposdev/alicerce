// modules/develop/content/part3-modulos.tsx
// Conteúdo estático — Taxonomia de entidade + guia passo a passo de criação de módulo.

import {
    DocSection,
    DocSubTitle,
    DocP,
    DocCode,
    DocCallout,
    DocStep,
    DocRouteTable,
} from "@modules/develop/components/DocBlocks";

export function TaxonomiaSection() {
    return (
        <DocSection id="taxonomia" kicker="Módulos" title="Taxonomia de entidade">
            <DocP>
                Antes de escrever qualquer código, classifique a entidade nova em um destes quatro tipos. A
                classificação decide onde o código vive e como ele é renderizado — errar aqui costuma gerar
                módulos com rota própria que deveriam ser apenas uma aba na tela de outro módulo.
            </DocP>

            <DocRouteTable
                rows={[
                    {
                        method: "GET",
                        path: "Módulo",
                        guard: "modules/<nome>/",
                        description:
                            "Entidade independente, com SEARCH e listagem próprias. Ganha rota /nome e /nome/[id]. Ex.: Role, Permission, Favorite.",
                    },
                    {
                        method: "SEARCH",
                        path: "Módulo Relacionado",
                        guard: "RelationShell",
                        description:
                            "Relação N:N entre dois Módulos independentes. Não tem rota própria — é um painel RelationShell dentro do detalhe de um dos dois módulos. Ex.: RolePermission, UserRole.",
                    },
                    {
                        method: "POST",
                        path: "Feature",
                        guard: "modules/<pai>/features/<feature>/",
                        description:
                            "Sub-recurso dependente (1:N, cascade delete). Vive dentro da pasta do módulo pai, sem rota de listagem própria. Ex.: notas de um favorito.",
                    },
                    {
                        method: "PATCH",
                        path: "Extensão de Módulo",
                        guard: "aba/seção no DetailView",
                        description:
                            "Complemento 1:1 do módulo pai, renderizado como seção do form de detalhe. Ex.: Person é extensão de User.",
                    },
                ]}
            />

            <DocCallout type="rule">
                Regra prática: se a entidade tem busca, paginação e filtro próprios e faz sentido o usuário
                &quot;entrar&quot; nela vindo do menu lateral, é <strong>Módulo</strong>. Se ela só existe no
                contexto de outra (nunca é acessada sozinha), é <strong>Feature</strong>,{" "}
                <strong>Extensão</strong> ou <strong>Módulo Relacionado</strong>, dependendo da cardinalidade.
            </DocCallout>
        </DocSection>
    );
}

export function GuiaCriarModuloSection() {
    return (
        <DocSection id="guia-modulo" kicker="Módulos" title="Passo a passo: criando um módulo novo">
            <DocP>
                Este roteiro assume um <strong>Módulo</strong> independente (o caso mais completo). Para
                Feature/Extensão/Módulo Relacionado, pule as etapas de rota e registry — elas não se aplicam.
                Use sempre <code>favorites</code> como referência lado a lado.
            </DocP>

            <div className="space-y-4">
                <DocStep n={1} title="Modelar no Prisma (backend/prisma/schema.prisma)">
                    <DocP>
                        Toda entidade de tenant tem, no mínimo, <code>id</code>, <code>tenantId</code> e a
                        relação com <code>Tenant</code>. Adicione índice em <code>tenantId</code> (e em
                        combinações usadas em filtros de busca).
                    </DocP>
                    <DocCode label="schema.prisma">
                        {`model Widget {
  id        String   @id @default(uuid())
  title     String
  tenantId  String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@index([tenantId])
}`}
                    </DocCode>
                    <DocP>
                        Depois: <code>npx prisma migrate dev --name add_widget</code> e{" "}
                        <code>npx prisma generate</code>.
                    </DocP>
                </DocStep>

                <DocStep n={2} title="DTOs (backend/src/modules/widget/dto/)">
                    <DocP>
                        Três DTOs mínimos: <code>create-widget.dto.ts</code>,{" "}
                        <code>update-widget.dto.ts</code> (geralmente <code>PartialType</code> do create) e{" "}
                        <code>search-widget.dto.ts</code> (searchText, pagination, sort, filters, groupBy —
                        mesmo formato usado por <code>SearchFavoritesDto</code>).
                    </DocP>
                    <DocCode label="dto/create-widget.dto.ts">
                        {`export class CreateWidgetDto {
  @IsString() @IsNotEmpty()
  title: string;
}`}
                    </DocCode>
                </DocStep>

                <DocStep n={3} title="Regra de negócio no Service">
                    <DocP>
                        O service nunca confia em <code>tenantId</code>/<code>userId</code> vindos do body —
                        eles chegam como parâmetro, injetados pelos decorators do controller. Todo{" "}
                        <code>findUnique</code> por id é seguido de uma checagem manual de posse (
                        <code>tenantId</code>/<code>userId</code>) antes de update/delete, como em{" "}
                        <code>favorites.service.ts</code>.
                    </DocP>
                    <DocCode label="widget.service.ts (search — paginação padrão)">
                        {`async search(query: SearchWidgetDto, tenantId: string) {
  const page = query.pagination?.pageIndex !== undefined ? query.pagination.pageIndex + 1 : 1;
  const limit = query.pagination?.pageSize ?? 20;
  const where = {
    tenantId,
    ...(query.searchText ? { title: { contains: query.searchText, mode: 'insensitive' as const } } : {}),
  };
  const [items, total] = await Promise.all([
    this.prisma.widget.findMany({ where, skip: (page - 1) * limit, take: limit }),
    this.prisma.widget.count({ where }),
  ]);
  return { items, total, page, limit };
}`}
                    </DocCode>
                </DocStep>

                <DocStep n={4} title="Endpoints no Controller">
                    <DocRouteTable
                        rows={[
                            { method: "POST", path: "/widget", guard: "@TenantId, @CurrentUserId", description: "create" },
                            { method: "GET", path: "/widget", guard: "@TenantId", description: "findAll (lista simples, se necessário)" },
                            { method: "GET", path: "/widget/:id", guard: "@TenantId", description: "findOne" },
                            { method: "PATCH", path: "/widget/:id", guard: "@TenantId", description: "update" },
                            { method: "DELETE", path: "/widget/:id", guard: "@TenantId", description: "remove" },
                            { method: "SEARCH", path: "/widget", guard: "@TenantId", description: "search (usado pelo TypeView)" },
                        ]}
                    />
                    <DocCallout type="warning">
                        Todo controller novo precisa ter <strong>as seis rotas acima</strong>. É exatamente a
                        ausência de <code>@Get(':id')</code> + <code>findOne</code> que hoje quebra a tela de
                        detalhe de Role/Permission — não repita esse gap em módulos novos.
                    </DocCallout>
                    <DocCode label="widget.module.ts">
                        {`@Module({
  controllers: [WidgetController],
  providers: [WidgetService],
})
export class WidgetModule {}
// registrar em app.module.ts -> imports: [..., WidgetModule]`}
                    </DocCode>
                </DocStep>

                <DocStep n={5} title="Types no frontend (modules/widget/types/types.ts)">
                    <DocP>
                        O type do frontend espelha o retorno do <code>findOne</code>/<code>search</code> do
                        backend (com relações já resolvidas), não o schema do Prisma cru.
                    </DocP>
                    <DocCode label="modules/widget/types/types.ts">
                        {`export interface WidgetEntity {
  id: string;
  title: string;
  tenantId?: string;
  userId?: string;
  createdAt: string;
  user: { id: string; email: string };
}`}
                    </DocCode>
                </DocStep>

                <DocStep n={6} title="Provider (modules/widget/config/provider.ts)">
                    <DocP>
                        Uma função por operação, todas chamando <code>apiServer</code>. É a única camada que
                        conhece a URL real do backend.
                    </DocP>
                    <DocCode label="modules/widget/config/provider.ts">
                        {`import { apiServer } from "@lib/api-server";
import type { SearchArgs, SearchResult } from "@lib/data-provider/types";
import type { WidgetEntity } from "@/modules/widget/types/types";

export async function searchWidgets(args: SearchArgs): Promise<SearchResult<WidgetEntity>> {
  const response = await apiServer.search<{ items: WidgetEntity[]; total: number; page: number; limit: number }>(
    "widget",
    { searchText: args.searchText, sort: args.sort, pagination: args.pagination, filters: args.filters },
  );
  return {
    data: response.items,
    pagination: {
      total: response.total, page: response.page, limit: response.limit,
      pages: Math.ceil(response.total / response.limit),
    },
  };
}

export async function readWidget(id: string) {
  return apiServer.get<WidgetEntity>(\`widget/\${id}\`, { cache: "no-store" });
}
export async function createWidget(payload: unknown) {
  return apiServer.post<WidgetEntity>("widget", payload);
}
export async function updateWidget(id: string, payload: unknown) {
  return apiServer.patch<WidgetEntity>(\`widget/\${id}\`, payload);
}
export async function deleteWidget(id: string) {
  await apiServer.delete(\`widget/\${id}\`);
}`}
                    </DocCode>
                </DocStep>

                <DocStep n={7} title="Colunas e ListView client (modules/widget/components/)">
                    <DocCallout type="rule" title="Fronteira RSC — não pule esta etapa">
                        As colunas do TanStack Table contêm funções e precisam nascer dentro de um arquivo{" "}
                        <code>&quot;use client&quot;</code>. Nunca as importe em um Server Component para
                        passar como prop.
                    </DocCallout>
                    <DocCode label="modules/widget/components/columns.tsx">
                        {`import type { ColumnDef } from "@tanstack/react-table";
import type { WidgetEntity } from "@/modules/widget/types/types";

export const widgetColumns: ColumnDef<WidgetEntity>[] = [
  { accessorKey: "title", header: "Título" },
  { accessorKey: "createdAt", header: "Criado em",
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString("pt-BR") },
];`}
                    </DocCode>
                    <DocCode label="modules/widget/components/WidgetListView.tsx">
                        {`"use client";
import { widgetColumns } from "./columns";
import { ListView } from "@/components/TypeView/ListView/ListView";
import type { WidgetEntity } from "@/modules/widget/types/types";

export function WidgetListView({ data }: { data: WidgetEntity[] }) {
  return <ListView columns={widgetColumns} data={data} />;
}`}
                    </DocCode>
                </DocStep>

                <DocStep n={8} title="Contrato do módulo (modules/widget/config/contract.tsx)">
                    <DocP>
                        Aqui tudo se conecta: campos de formulário, layouts de listagem/detalhe e o registro
                        no <code>registry</code> via <code>defineRecordModule</code> +{" "}
                        <code>registerModule</code>.
                    </DocP>
                    <DocCode label="modules/widget/config/contract.tsx">
                        {`import { defineRecordModule, registerModule } from "@lib/registry";
import { createListQueryState } from "@lib/query-state/list-query-state";
import { FormView } from "@/components/TypeView/FormView/FormView";
import { WidgetListView } from "@modules/widget/components/WidgetListView";
import { searchWidgets, readWidget, createWidget, updateWidget, deleteWidget } from "./provider";
import type { WidgetEntity } from "@/modules/widget/types/types";

const formFields = [
  { name: "title" as const, label: "Título", type: "text" as const, required: true },
];

const { parseListState, serializeListState } = createListQueryState();

export const widgetModule = defineRecordModule<WidgetEntity>({
  model: "widget",
  label: "Widgets",
  views: ["list", "form"],
  defaultView: "list",
  dataHandlers: { search: searchWidgets, read: readWidget, create: createWidget, update: updateWidget, delete: deleteWidget },
  formFields,
  parseListState,
  serializeListState,
  listLayout: {
    list: ({ data }) => <WidgetListView data={data} />,
    form: () => <FormView<WidgetEntity> mode="create" fields={formFields} createAction={/* ... */ undefined as never} />,
  },
  detailLayout: {
    main: ({ record }) => (
      <FormView<WidgetEntity> mode="edit" model="widget" recordId={record.id} fields={formFields} initialValues={record} />
    ),
  },
});

registerModule(widgetModule);`}
                    </DocCode>
                </DocStep>

                <DocStep n={9} title="Registrar no bootstrap (lib/registry/bootstrap.ts)">
                    <DocCode label="lib/registry/bootstrap.ts">
                        {`import "@modules/favorites/config/contract";
// ...
import "@modules/widget/config/contract"; // <- adicionar aqui`}
                    </DocCode>
                    <DocP>
                        Sem essa linha, <code>getModule(&quot;widget&quot;)</code> lança em runtime — o
                        registry é a única fonte de verdade sobre quais módulos existem.
                    </DocP>
                </DocStep>

                <DocStep n={10} title="Rotas (app/(app)/widget/page.tsx e [id]/page.tsx)">
                    <DocCode label="app/(app)/widget/page.tsx">
                        {`import { TypeViewScreen } from "@/screens/TypeViewScreen";

export default function WidgetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <TypeViewScreen moduleName="widget" searchParams={searchParams} />;
}`}
                    </DocCode>
                    <DocCode label="app/(app)/widget/[id]/page.tsx">
                        {`import { DetailViewScreen } from "@/screens/DetailViewScreen";

export default async function WidgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetailViewScreen moduleName="widget" id={id} />;
}`}
                    </DocCode>
                </DocStep>

                <DocStep n={11} title="Autorização e navegação (lib/authz.ts + AppSidebar)">
                    <DocCode label="lib/authz.ts">
                        {`{ prefix: '/widget', permission: 'widget.read', module: 'widget', title: 'Widgets' },`}
                    </DocCode>
                    <DocP>
                        Adicione o ícone em <code>MODULE_ICONS</code> no <code>AppSidebar.tsx</code>. O item
                        de menu aparece automaticamente — não crie link manual em nenhum outro lugar.
                    </DocP>
                </DocStep>
            </div>
        </DocSection>
    );
}

export function ChecklistSection() {
    return (
        <DocSection id="checklist" kicker="Módulos" title="Checklist final antes do commit">
            <DocCode label="checklist de módulo novo">
                {`[ ] Model no schema.prisma com tenantId + índice, migration aplicada
[ ] DTOs create/update/search
[ ] Service: toda leitura/escrita filtra por tenantId; include usa select
[ ] Controller com as 6 rotas (POST, GET, GET:id, PATCH, DELETE, SEARCH)
[ ] Module registrado em app.module.ts
[ ] types/types.ts no frontend espelhando o retorno real da API
[ ] provider.ts com uma função por operação, usando apiServer
[ ] columns.tsx + <Modulo>ListView.tsx ("use client", colunas não cruzam a fronteira RSC)
[ ] contract.tsx com defineRecordModule + registerModule
[ ] import do contract.tsx em lib/registry/bootstrap.ts
[ ] app/(app)/<modulo>/page.tsx e [id]/page.tsx
[ ] entrada em lib/authz.ts (ROUTE_RULES e, se preciso, ACTION_PERMISSION_RULES)
[ ] ícone em AppSidebar.tsx
[ ] npx tsc --noEmit && npm run build passando em frontend e backend`}
            </DocCode>
            <DocCallout type="info">
                Faça isso em commits pequenos e individualmente testáveis — schema, depois backend completo,
                depois frontend completo — rodando o checkpoint de build entre cada etapa, como já é hábito
                no restante do projeto.
            </DocCallout>
        </DocSection>
    );
}
