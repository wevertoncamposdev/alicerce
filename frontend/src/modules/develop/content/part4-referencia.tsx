// modules/develop/content/part4-referencia.tsx
// Conteúdo estático — armadilhas conhecidas, glossário de termos e estado atual do repo.

import {
    DocSection,
    DocSubTitle,
    DocP,
    DocCode,
    DocCallout,
} from "@modules/develop/components/DocBlocks";

export function ArmadilhasSection() {
    return (
        <DocSection id="armadilhas" kicker="Referência" title="Armadilhas conhecidas">
            <DocCallout type="rule" title="1. Fronteira RSC com ColumnDef">
                Já causou bug recorrente após rebase. <code>ColumnDef</code> com funções{" "}
                <code>cell</code> não serializa entre Server e Client Component. Solução fixa: cada módulo
                tem seu próprio <code>&lt;Modulo&gt;ListView.tsx</code> com{" "}
                <code>&quot;use client&quot;</code> importando as colunas internamente.
            </DocCallout>

            <DocCallout type="danger" title="2. tenantId ausente em queries de relação">
                Relações N:N (<code>RolePermission</code>, <code>UserRole</code>) são o lugar mais fácil de
                esquecer o filtro de tenant, porque a query parte do id da entidade pai e &quot;parece&quot;
                já estar escopada. Sempre passe <code>tenantId</code> explicitamente.
            </DocCallout>

            <DocCallout type="warning" title="3. Aliasing de nomes entre RelationShell">
                Generalizar nomes de componente/entidade (<code>Entity</code> em vez de{" "}
                <code>TenantEntity</code>, por exemplo) quebra em import quando dois módulos compõem painéis{" "}
                <code>RelationShell</code> na mesma página. Use nomes exclusivos por módulo.
            </DocCallout>

            <DocCallout type="info" title="4. apiServer é server-only">
                Importar <code>lib/api-server.ts</code> num Client Component quebra o build (ele lê cookies
                via <code>next/headers</code>). Formulários client-side com autosave usam{" "}
                <code>lib/api-client.ts</code> ou Server Actions — nunca <code>apiServer</code> direto.
            </DocCallout>

            <DocCallout type="warning" title="5. DataProvider é o único caminho de escrita">
                Server Actions não chamam <code>revalidatePath</code> durante autosave — os hooks de
                autosave são agnósticos de domínio; quem chama normaliza o formato de payload. Não escreva
                no banco fora do <code>dataProvider</code>/<code>provider.ts</code> do módulo.
            </DocCallout>
        </DocSection>
    );
}

export function EstadoAtualSection() {
    return (
        <DocSection id="estado-atual" kicker="Referência" title="Estado atual do repositório (pendências)">
            <DocP>
                Snapshot das pendências conhecidas no fechamento da v1.0 — útil para não reintroduzir os
                mesmos bugs em módulos novos e para saber onde tocar com cuidado extra.
            </DocP>
            <DocCode label="pendências abertas">
                {`1. RolesController / PermissionsController sem @Get(':id') + findOne no service
   -> causa raiz das telas de detalhe quebradas de Role e Permission
2. readRolePermissions / readRoleUsers não enviam tenantId
   -> risco de vazamento de dado entre tenants
3. RolePermissionsHost / RoleUsersHost em modules/roles/ ainda importam de
   @/features/roles/services/roleService (pasta legada) — bloqueia a remoção de features/
4. Extrair mutações de role para modules/roles/config/client-actions.ts
5. Construir painel reverso em permissions (GET :id/roles)
6. Construir módulo audit completo (backend: SearchAuditDto + @Search(); frontend: somente leitura/listagem)
7. Remover features/ legado e components/shells/ (exceto SideShell, que migra para components/Layout/)`}
            </DocCode>
            <DocCallout type="info">
                Estas notas refletem o estado do repositório no momento em que esta página foi escrita.
                Atualize esta seção conforme os itens forem resolvidos — ela deve sempre espelhar a
                realidade do código, não um plano estático.
            </DocCallout>

            <DocSubTitle>Licenciamento</DocSubTitle>
            <DocP>
                O Alicerce usa <strong>BSL 1.1</strong>: código fonte visível (bom para portfólio),
                exclusividade comercial durante a fase inicial do produto, com conversão programada para
                Apache-2.0 depois de um período definido.
            </DocP>
        </DocSection>
    );
}

export function GlossarioSection() {
    return (
        <DocSection id="glossario" kicker="Referência" title="Glossário — Alicerce ↔ projeto de referência">
            <DocP>
                Mapeamento de termos entre a nomenclatura usada nesta documentação/no Alicerce e os nomes
                originais em <code>system_development</code>, para quem for comparar os dois repositórios
                lado a lado.
            </DocP>
            <DocCode label="mapeamento de termos">
                {`TypeView         = views/*View.tsx + ViewSwitcher
PainelSearchShell = SearchBar + PageControlPanel
DetailShell       = DetailShellEngine
MetaDataShell     = StandardDetailMetadataSide
RelationShell     = RelationListHost + DetailRelationTablePanel
FormView          = RecordForm`}
            </DocCode>
        </DocSection>
    );
}
