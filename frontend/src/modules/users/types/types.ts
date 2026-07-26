
export type UserEntity = {
    id: string;
    email: string;
    tenantId: string;
    createdAt: string;
};

export type CreateUserPayload = {
    email: string;
    password: string;
    tenantId?: string;
    personId?: string;
};

export type UpdateUserPayload = {
    email?: string;
    password?: string;
    tenantId?: string;
    personId?: string;
};

export type ContextItem = {
    key: string;
    label: string;
    value: string;
};