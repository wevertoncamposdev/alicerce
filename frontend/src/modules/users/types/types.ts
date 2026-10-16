
export type UserEntity = {
    id: string;
    email: string;
    password?: string;
    tenantId: string;
    status: string;
    createdAt: string;
};

export type ContextItem = {
    key: string;
    label: string;
    value: string;
};