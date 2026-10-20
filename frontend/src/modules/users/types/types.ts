
export type UserEntity = {
    id: string;
    email: string;
    name?: string | null;
    tenantId: string;
    status: string;
    pendingInvite?: boolean;
    avatarFileId?: string | null;
    avatarUrl?: string | null;
    createdAt: string;
};

export type ContextItem = {
    key: string;
    label: string;
    value: string;
};