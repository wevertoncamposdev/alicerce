export interface RegisterInput {
    tenantName?: string;
    tenantSlug?: string;
    email: string;
    name?: string;
    password: string;
}

export interface AuthUserProfile {
    id: string;
    email: string;
    name?: string | null;
    tenantId: string;
    permissions: string[];
    emailVerified: boolean;
}
