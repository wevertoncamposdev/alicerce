export interface UserEntity {
    id: string;
    email: string;
    tenantId?: string;
}

export interface UserPayload {
    email: string;
    password: string;
    tenantId: string;
}

export interface UserUpdatePayload {
    email?: string;
    password?: string;
}
