
// Este arquivo hoje só guarda os TIPOS compartilhados de auth. As funções
// que faziam fetch direto pro Nest (loginWithPassword, registerPublic,
// fetchProfile) foram removidas: esse fetch agora acontece só dentro dos
// Route Handlers em app/api/auth/*, que rodam no servidor e têm acesso ao
// cookie httpOnly. Ver contexts/auth-context.tsx.

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