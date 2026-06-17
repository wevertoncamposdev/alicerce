export type RouteAccessMeta = {
    prefix: string;
    permission: string;
    module: 'users' | 'roles' | 'permissions' | 'audit' | 'tenants' | 'tasks';
    title: string;
};

const ROUTE_RULES: ReadonlyArray<RouteAccessMeta> = [
    { prefix: '/main/users', permission: 'user.read', module: 'users', title: 'Usuarios' },
    { prefix: '/main/roles', permission: 'role.read', module: 'roles', title: 'Papeis' },
    { prefix: '/main/permissions', permission: 'permission.read', module: 'permissions', title: 'Permissoes' },
    { prefix: '/main/audit', permission: 'audit.read', module: 'audit', title: 'Auditoria' },
    { prefix: '/main/tenants', permission: 'tenant.read', module: 'tenants', title: 'Tenants' },
    { prefix: '/main/tasks', permission: 'task.read', module: 'tasks', title: 'Tarefas' },
];

const ACTION_PERMISSION_RULES = {
    'users.create': 'user.create',
    'users.update': 'user.update',
    'users.delete': 'user.delete',
    'roles.create': 'role.create',
    'roles.update': 'role.update',
    'roles.delete': 'role.delete',
    'roles.assign': 'role.assign',
    'permissions.create': 'permission.create',
    'permissions.update': 'permission.update',
    'permissions.delete': 'permission.delete',
    'audit.refresh': 'audit.read',
    'tenants.create': 'tenant.update',
    'tenants.update': 'tenant.update',
    'tenants.delete': 'tenant.update',
    'tasks.create': 'task.create',
    'tasks.update': 'task.update',
    'tasks.delete': 'task.delete',
} as const;

export type AuthAction = keyof typeof ACTION_PERMISSION_RULES;

export function listRouteRules(): ReadonlyArray<RouteAccessMeta> {
    return ROUTE_RULES;
}

export function resolveRouteAccess(pathname: string): RouteAccessMeta | null {
    const matched = ROUTE_RULES.find((rule) => pathname.startsWith(rule.prefix));
    return matched ?? null;
}

export function resolveRoutePermission(pathname: string): string | null {
    return resolveRouteAccess(pathname)?.permission ?? null;
}

export function canAccessRoute(pathname: string, permissions: string[]): boolean {
    const required = resolveRoutePermission(pathname);

    if (!required) {
        return true;
    }

    return permissions.includes(required);
}

export function resolveActionPermission(action: AuthAction): string {
    return ACTION_PERMISSION_RULES[action];
}

export function canAccessAction(action: AuthAction, permissions: string[]): boolean {
    return permissions.includes(resolveActionPermission(action));
}
