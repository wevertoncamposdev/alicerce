export type MeProfile = {
    id: string;
    email: string;
    name?: string | null;
    theme?: string | null;
    locale?: string | null;
    avatarFileId?: string | null;
    avatarUrl?: string | null;
};

export type MeSession = {
    familyId: string;
    userAgent: string | null;
    ip: string | null;
    lastUsedAt: string | null;
    createdAt: string;
    isCurrent: boolean;
};

// Etapa 9.2 (LGPD) — formato de GET /me/export (MeService.exportMyData).
export type MeExport = {
    profile: MeProfile;
    sessions: Omit<MeSession, "isCurrent">[];
    consents: { document: string; version: string; acceptedAt: string; ip: string | null }[];
    activity: { action: string; entity: string; entityId: string | null; type: string; createdAt: string }[];
};
