export interface Tenant {
    id: string;
    name: string;
    slug: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}

export interface TenantFormValues {
    name: string;
    slug: string;
    description: string;
}

export interface TenantPayload {
    name: string;
    slug: string;
    description?: string;
}
