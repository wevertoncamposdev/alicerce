export type RoleType = 'ADMIN' | 'USER' | 'GUEST';

export interface RoleEntity {
    id: string;
    tenantId: string;
    name: string;
    type: RoleType;
    description?: string | null;
    status?: string;
    // ADR 0007: `type` virou só metadado — quem decide acesso de admin é
    // isSystem (bloqueia renomear/excluir o papel ADMIN seedado).
    isSystem?: boolean;
    createdAt?: string;
}

export type ContextItem = { key: string; label: string; value: string };