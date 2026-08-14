export type RoleEntity = {
    id: string;
    name: string;
    type: string;
    description: string;
    createdAt: string;
}

export type ContextItem = {
    key: string;
    label: string;
    value: string;
};

export type CreateRolePayload = Pick<RoleEntity, "name" | "type" | "description"> &
    Partial<Pick<RoleEntity, "createdAt">>;

export type UpdateRolePayload = Partial<CreateRolePayload>;