export interface LoginInput {
    email: string;
    password: string;
}

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
    roles: string[];
    permissions: string[];
}

export interface AuthSessionResponse {
    access_token: string;
    user: AuthUserProfile;
    tenant: {
        id: string;
        legalName: string;
        slug: string;
    };
}
