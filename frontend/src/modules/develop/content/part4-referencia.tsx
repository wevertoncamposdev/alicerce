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
                Revisado em 2026-10-13 contra o código real (a lista anterior, do fechamento da v1.0,
                estava com a maioria dos itens já resolvidos e não refletia mais a realidade). O backlog
                tático completo e priorizado vive em <code>PLAN.md</code>, na raiz do repositório — esta
                seção é só um resumo rápido do que ainda falta tocar neste motor de UI especificamente.
            </DocP>
            <DocCode label="pendências abertas">
                {`1. Padronizar o backend de audit no mesmo contrato dos outros módulos
   (SearchAuditDto + @Search()) — hoje funciona via GET com query params,
   só não segue o padrão formal que roles/users/permissions/tenants seguem.
2. Views Kanban e Calendar aparecem no ViewSwitcher mas não têm componente
   implementado — decidir se entram ou se o ícone sai do switcher.`}
            </DocCode>
            <DocCallout type="info">
                <code>features/</code> legado foi totalmente removido em 2026-10-13 (os itens antigos #1,
                #2, #3, #5 desta lista — telas de detalhe de Role/Permission quebradas, tenantId ausente em
                <code>readRolePermissions</code>/<code>readRoleUsers</code>, import de pasta legada, painel
                reverso de permissions — já estavam resolvidos; o antigo item #4, &quot;extrair mutações
                para <code>config/client-actions.ts</code>&quot;, foi resolvido na direção oposta: esse
                arquivo era um rascunho duplicado sem uso e foi removido —{" "}
                <code>actions/roleService.ts</code> é o lugar definitivo). <code>components/shells/</code>
                legado (<code>RelationShell</code>, <code>PainelSearchShell</code>, <code>SideShell</code>)
                também foi removido em 2026-10-13 — <code>audit/page.tsx</code> passou a usar{" "}
                <code>TypeViewScreen</code> como todo módulo real (ele já tinha contrato registrado e nunca
                era usado), e <code>SideShell</code> migrou para <code>components/Layout/SideShell.tsx</code>{" "}
                com os tokens atuais. Atualize esta seção conforme os itens acima forem resolvidos — ela deve
                sempre espelhar a realidade do código, não um plano estático.
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
