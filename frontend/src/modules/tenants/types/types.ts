export type TenantEntity = {
    id: string;
    legalName: string;
    tradeName?: string | null;
    registrationNumber: string;
    slug: string;
    email?: string | null;
    website?: string | null;
    createdAt: string;
};

export type ContextItem = {
    key: string;
    label: string;
    value: string;
};

export type CreateTenantPayload = Pick<TenantEntity, "legalName" | "registrationNumber" | "slug"> &
    Partial<Pick<TenantEntity, "tradeName" | "email" | "website">>;

export type UpdateTenantPayload = Partial<CreateTenantPayload>;