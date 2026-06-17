import { apiRequest } from "@/lib/api-client";

export interface LoginInput {
    email: string;
    password: string;
}

export interface RegisterInput {
    tenantName: string;
    tenantSlug: string;
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

export async function loginWithPassword(input: LoginInput): Promise<AuthSessionResponse> {
    return apiRequest<AuthSessionResponse>("/auth/login", {
        method: "POST",
        body: input,
    });
}

export async function registerPublic(input: RegisterInput): Promise<AuthSessionResponse> {
    return apiRequest<AuthSessionResponse>("/auth/register", {
        method: "POST",
        body: input,
    });
}

export async function fetchProfile(token: string): Promise<AuthUserProfile> {
    return apiRequest<AuthUserProfile>("/auth/profile", {
        method: "GET",
        token,
    });
}
