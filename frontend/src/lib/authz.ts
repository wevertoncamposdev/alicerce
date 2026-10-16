import { alicerceModules } from "@/alicerce.config";

export type RouteAccessMeta = {
    prefix: string;
    permission: string;
    module: (typeof alicerceModules)[number]["key"];
    title: string;
};

const ROUTE_RULES: ReadonlyArray<RouteAccessMeta> = alicerceModules.map((mod) => ({
    prefix: mod.basePath,
    permission: mod.permission,
    module: mod.key,
    title: mod.title,
}));

const ACTION_PERMISSION_RULES: Record<string, string> = Object.fromEntries(
    alicerceModules.flatMap((mod) =>
        Object.entries(mod.actionPermissions ?? {}).map(
            ([action, permission]): [string, string] => [`${mod.key}.${action}`, permission],
        ),
    ),
);

// `Object.fromEntries` sempre larga pra `Record<string, string>` (limitação
// conhecida do TS) — reconstrói a union literal exata (`"users.create" |
// "roles.assign" | ...`) direto de `alicerceModules`, sem precisar repetir
// as chaves à mão.
type ModuleActionKeys<M> = M extends { key: infer K extends string; actionPermissions?: infer A }
    ? A extends Record<string, string>
        ? `${K}.${Extract<keyof A, string>}`
        : never
    : never;

export type AuthAction = ModuleActionKeys<(typeof alicerceModules)[number]>;

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
