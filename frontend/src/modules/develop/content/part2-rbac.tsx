// modules/develop/content/part2-rbac.tsx
// Conteúdo estático — Users, Roles, Permissions e como o RBAC se propaga ao frontend.

import {
    DocSection,
    DocSubTitle,
    DocP,
    DocCode,
    DocCallout,
} from "@modules/develop/components/DocBlocks";

export function RbacSection() {
    return (
        <DocSection id="rbac" kicker="Fundamentos" title="Users, Roles e Permissions (RBAC)">
            <DocP>
                O controle de acesso é RBAC clássico: um <code>User</code> tem N <code>Role</code>s, uma{" "}
                <code>Role</code> tem N <code>Permission</code>s. As tabelas de junção (
                <code>UserRole</code>, <code>RolePermission</code>) são <strong>Módulos Relacionados</strong>{" "}
                (N:N entre dois Módulos independentes) e por isso são renderizadas como painéis{" "}
                <code>RelationShell</code> dentro da tela de detalhe de Role — não como módulos próprios com
                rota de listagem.
            </DocP>

            <DocSubTitle>Taxonomia de entidade aplicada ao RBAC</DocSubTitle>
            <DocCode label="taxonomia">
                {`Role         -> Módulo independente (própria rota /roles, SEARCH, CRUD)
Permission   -> Módulo independente (própria rota /permissions, SEARCH, CRUD)
RolePermission -> Módulo Relacionado (N:N Role<->Permission) -> RelationShell dentro de /roles/[id]
UserRole       -> Módulo Relacionado (N:N User<->Role)       -> RelationShell dentro de /users/[id]

(Extensão de Módulo — complemento 1:1 do módulo pai, renderizado como seção
do form de detalhe — ainda não tem exemplo real neste projeto; o padrão
existe na taxonomia pra quando surgir um caso de uso.)`}
            </DocCode>

            <DocSubTitle>Backend — decorator de autorização</DocSubTitle>
            <DocCode label="core/common/decorators/permissions.decorator.ts">
                {`export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);`}
            </DocCode>
            <DocP>
                Assim como <code>@Public()</code>, esse decorator anexa metadata lida por{" "}
                <code>RolesPermissionsGuard</code> (via <code>Reflector</code>) para bloquear o acesso quando a
                permissão fresca do usuário (cache/DB, nunca o JWT) não bate com a exigida pela rota. Desde o
                ADR 0007, não existe mais <code>@Roles</code>/checagem por role — só permissão. O padrão de
                nomeação é <code>&lt;entidade&gt;.&lt;ação&gt;</code> — ex.: <code>role.read</code>,{" "}
                <code>role.update</code>, <code>feedback.manage</code>.
            </DocP>

            <DocSubTitle>Frontend — authz.ts é a fonte única de verdade</DocSubTitle>
            <DocP>
                O arquivo <code>lib/authz.ts</code> centraliza duas coisas: quais permissions cada rota exige
                (<code>ROUTE_RULES</code>) e quais permissions cada ação de UI exige (
                <code>ACTION_PERMISSION_RULES</code>). Nenhum componente decide isso sozinho — todos
                consultam <code>authz.ts</code>.
            </DocP>
            <DocCode label="lib/authz.ts (trecho real)">
                {`const ROUTE_RULES: ReadonlyArray<RouteAccessMeta> = [
  { prefix: '/users', permission: 'user.read', module: 'users', title: 'Usuarios' },
  { prefix: '/roles', permission: 'role.read', module: 'roles', title: 'Papeis' },
  { prefix: '/permissions', permission: 'permission.read', module: 'permissions', title: 'Permissoes' },
  // ...
];

const ACTION_PERMISSION_RULES = {
  'roles.create': 'role.create',
  'roles.update': 'role.update',
  'roles.delete': 'role.delete',
  'roles.assign': 'role.assign',
  // ...
} as const;`}
            </DocCode>
            <DocP>
                Ao criar um módulo novo, você adiciona uma linha em <code>ROUTE_RULES</code> (e, se houver
                ações restritas, em <code>ACTION_PERMISSION_RULES</code>). O <code>AppSidebar</code> lê{" "}
                <code>listRouteRules()</code> para montar a navegação automaticamente e desabilita o item via{" "}
                <code>hasPermission(route.permission)</code> — você não escreve lógica de visibilidade de
                menu manualmente.
            </DocP>

            <DocCallout type="warning" title="Naming em RelationShell entre módulos">
                Generalizar nomes de entidade/componente (usar <code>Entity</code> em vez de{" "}
                <code>TenantEntity</code>, por exemplo) cria conflito de alias quando dois módulos diferentes
                compõem painéis <code>RelationShell</code> no mesmo arquivo/página. Sempre use nomes
                exclusivos por módulo (<code>RolePermissionsHost</code>, <code>RoleUsersHost</code>, e não
                nomes genéricos reaproveitados).
            </DocCallout>

            <DocSubTitle>Pendências conhecidas neste ponto do projeto</DocSubTitle>
            <DocP>
                Ao mexer em Roles/Permissions, esteja ciente do estado atual do repositório (ver também a
                seção &quot;Armadilhas conhecidas&quot;): faltam rotas <code>@Get(&apos;:id&apos;)</code> e{" "}
                <code>findOne</code> em <code>RolesController</code>/<code>PermissionsController</code>, e{" "}
                <code>readRolePermissions</code>/<code>readRoleUsers</code> ainda não enviam{" "}
                <code>tenantId</code> — isso é exatamente o tipo de vazamento descrito na seção de
                multi-tenant.
            </DocP>
        </DocSection>
    );
}
