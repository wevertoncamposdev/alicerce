export interface RegisterInput {
    tenantName?: string;
    tenantSlug?: string;
    email: string;
    password: string;
}

export interface AuthUserProfile {
    id: string;
    email: string;
    tenantId: string;
    permissions: string[];
}
