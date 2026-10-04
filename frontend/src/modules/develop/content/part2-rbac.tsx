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
Person         -> Extensão de Módulo (1:1 com User)          -> seção/aba dentro de /users/[id]`}
            </DocCode>

            <DocSubTitle>Backend — decorators de autorização</DocSubTitle>
            <DocCode label="core/common/decorators/roles.decorator.ts e permissions.decorator.ts">
                {`export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);`}
            </DocCode>
            <DocP>
                Assim como <code>@Public()</code>, esses decorators anexam metadata lida por um guard (via{" "}
                <code>Reflector</code>) para bloquear o acesso quando o usuário do token não tem a
                role/permission exigida pela rota. O padrão de nomeação de permission é{" "}
                <code>&lt;entidade&gt;.&lt;ação&gt;</code> — ex.: <code>role.read</code>,{" "}
                <code>role.update</code>, <code>permission.create</code>.
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
                seção &quot;Armadilhas conhecidas&quot;): faltam rotas <code>@Get(':id')</code> e{" "}
                <code>findOne</code> em <code>RolesController</code>/<code>PermissionsController</code>, e{" "}
                <code>readRolePermissions</code>/<code>readRoleUsers</code> ainda não enviam{" "}
                <code>tenantId</code> — isso é exatamente o tipo de vazamento descrito na seção de
                multi-tenant.
            </DocP>
        </DocSection>
    );
}
