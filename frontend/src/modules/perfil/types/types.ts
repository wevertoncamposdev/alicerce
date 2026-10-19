export type MeProfile = {
    id: string;
    email: string;
    name?: string | null;
    theme?: string | null;
    locale?: string | null;
};

export type MeSession = {
    familyId: string;
    userAgent: string | null;
    ip: string | null;
    lastUsedAt: string | null;
    createdAt: string;
    isCurrent: boolean;
};
