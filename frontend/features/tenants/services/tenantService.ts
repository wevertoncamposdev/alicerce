import { apiRequest } from "@/lib/api-client";
import { Tenant, TenantPayload } from "../tenant.types";

interface BackendTenant {
    id: string;
    legalName: string;
    tradeName?: string | null;
    slug: string;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TenantRequestScope {
    tenantId?: string;
    token?: string | null;
}

const DEFAULT_SCOPE_TENANT = "public";

function toTenant(item: BackendTenant): Tenant {
    return {
        id: item.id,
        name: item.tradeName || item.legalName,
        slug: item.slug,
        description: item.description ?? "",
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}

function buildRegistrationNumber(slug: string) {
    const normalized = slug.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase() || "TENANT";
    const stamp = Date.now().toString().slice(-10);
    return `${normalized}${stamp}`.slice(0, 20);
}

function resolveScopeTenantId(tenantId?: string) {
    return tenantId || DEFAULT_SCOPE_TENANT;
}

export async function fetchTenants(options?: TenantRequestScope): Promise<Tenant[]> {
    const scopedTenantId = resolveScopeTenantId(options?.tenantId);
    const tenants = await apiRequest<BackendTenant[]>(`/tenant/${scopedTenantId}`, {
        method: "GET",
        token: options?.token,
        tenantId: scopedTenantId,
    });

    return tenants
        .map(toTenant)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createTenant(payload: TenantPayload, options?: TenantRequestScope): Promise<Tenant> {
    const scopedTenantId = resolveScopeTenantId(options?.tenantId);
    const created = await apiRequest<BackendTenant>(`/tenant/${scopedTenantId}`, {
        method: "POST",
        tenantId: scopedTenantId,
        token: options?.token,
        body: {
            legalName: payload.name.trim(),
            tradeName: payload.name.trim(),
            registrationNumber: buildRegistrationNumber(payload.slug),
            slug: payload.slug.trim().toLowerCase(),
            description: payload.description?.trim() ?? "",
            category: "OTHER",
            primaryServiceArea: "OTHER",
        },
    });

    return toTenant(created);
}

export async function updateTenant(
    id: string,
    payload: TenantPayload,
    options: TenantRequestScope,
): Promise<Tenant> {
    const scopedTenantId = resolveScopeTenantId(options.tenantId);
    const updated = await apiRequest<BackendTenant>(`/tenant/${scopedTenantId}/${id}`, {
        method: "PATCH",
        token: options.token,
        tenantId: scopedTenantId,
        body: {
            legalName: payload.name.trim(),
            tradeName: payload.name.trim(),
            slug: payload.slug.trim().toLowerCase(),
            description: payload.description?.trim() ?? "",
        },
    });

    return toTenant(updated);
}

export async function removeTenant(id: string, options: TenantRequestScope): Promise<null> {
    const scopedTenantId = resolveScopeTenantId(options.tenantId);

    return apiRequest<null>(`/tenant/${scopedTenantId}/${id}`, {
        method: "DELETE",
        token: options.token,
        tenantId: scopedTenantId,
    });
}
