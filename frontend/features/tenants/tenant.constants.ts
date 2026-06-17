import { TenantFormValues } from "./tenant.types";

export const TENANTS_STORAGE_KEY = "didactic.tenants";

export const TENANT_INITIAL_FORM_VALUES: TenantFormValues = {
    name: "",
    slug: "",
    description: "",
};

export function slugifyTenant(value: string) {
    return value
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}
