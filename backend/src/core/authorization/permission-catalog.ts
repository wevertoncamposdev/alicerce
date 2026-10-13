import { PermissionType } from '@core/prisma/generated/enums';

export interface PermissionDefinition {
  name: string;
  type: PermissionType;
  resource: string;
  description: string;
  /**
   * `tenant.manage` é cross-tenant (busca/remoção de qualquer tenant) e fica
   * reservado ao futuro módulo `management` (Fase 7) — nunca é concedido
   * automaticamente ao ADMIN de um tenant recém-criado, mesmo que ele receba
   * todas as outras permissões deste catálogo.
   */
  grantToTenantAdmin?: boolean;
}

/**
 * Fonte única das permissões da plataforma (AGENTS.md §3.2.5). Consumida por
 * `prisma/seed.ts` (seed de desenvolvimento) e por `AuthService.signUpPublic`
 * (onboarding público) — antes desta extração, cada um mantinha sua própria
 * lista, divergente e sem sincronia.
 */
export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  {
    name: 'user.create',
    type: 'WRITE',
    resource: 'users',
    description: 'Criar usuários',
  },
  {
    name: 'user.read',
    type: 'READ',
    resource: 'users',
    description: 'Consultar usuários',
  },
  {
    name: 'user.update',
    type: 'WRITE',
    resource: 'users',
    description: 'Atualizar usuários',
  },
  {
    name: 'user.delete',
    type: 'DELETE',
    resource: 'users',
    description: 'Remover usuários',
  },
  {
    name: 'role.create',
    type: 'WRITE',
    resource: 'roles',
    description: 'Criar papéis',
  },
  {
    name: 'role.read',
    type: 'READ',
    resource: 'roles',
    description: 'Consultar papéis',
  },
  {
    name: 'role.update',
    type: 'WRITE',
    resource: 'roles',
    description: 'Atualizar papéis',
  },
  {
    name: 'role.delete',
    type: 'DELETE',
    resource: 'roles',
    description: 'Remover papéis',
  },
  {
    name: 'role.assign',
    type: 'WRITE',
    resource: 'roles',
    description: 'Gerenciar associação de papéis',
  },
  {
    name: 'permission.create',
    type: 'WRITE',
    resource: 'permissions',
    description: 'Criar permissões',
  },
  {
    name: 'permission.read',
    type: 'READ',
    resource: 'permissions',
    description: 'Consultar permissões',
  },
  {
    name: 'permission.update',
    type: 'WRITE',
    resource: 'permissions',
    description: 'Atualizar permissões',
  },
  {
    name: 'permission.delete',
    type: 'DELETE',
    resource: 'permissions',
    description: 'Remover permissões',
  },
  {
    name: 'favorite.create',
    type: 'WRITE',
    resource: 'favorites',
    description: 'Criar favoritos',
  },
  {
    name: 'favorite.read',
    type: 'READ',
    resource: 'favorites',
    description: 'Consultar favoritos',
  },
  {
    name: 'favorite.update',
    type: 'WRITE',
    resource: 'favorites',
    description: 'Atualizar favoritos',
  },
  {
    name: 'favorite.delete',
    type: 'DELETE',
    resource: 'favorites',
    description: 'Remover favoritos',
  },
  {
    name: 'task.create',
    type: 'WRITE',
    resource: 'tasks',
    description: 'Criar tarefas',
  },
  {
    name: 'task.read',
    type: 'READ',
    resource: 'tasks',
    description: 'Consultar tarefas',
  },
  {
    name: 'task.update',
    type: 'WRITE',
    resource: 'tasks',
    description: 'Atualizar tarefas',
  },
  {
    name: 'task.delete',
    type: 'DELETE',
    resource: 'tasks',
    description: 'Remover tarefas',
  },
  {
    name: 'audit.read',
    type: 'READ',
    resource: 'audit',
    description: 'Consultar trilha de auditoria',
  },
  {
    name: 'tenant.read',
    type: 'READ',
    resource: 'tenants',
    description: 'Consultar o próprio tenant',
  },
  {
    name: 'tenant.update',
    type: 'WRITE',
    resource: 'tenants',
    description: 'Atualizar o próprio tenant',
  },
  {
    name: 'tenant.manage',
    type: 'WRITE',
    resource: 'tenants',
    description:
      'Buscar/remover qualquer tenant (reservado ao módulo management, Fase 7)',
    grantToTenantAdmin: false,
  },
];

/**
 * Nomes das permissões concedidas automaticamente ao ADMIN de um tenant
 * recém-criado (seed de desenvolvimento ou onboarding público) — todo o
 * catálogo, exceto as marcadas com `grantToTenantAdmin: false`.
 */
export const TENANT_ADMIN_PERMISSION_NAMES: readonly string[] =
  PERMISSION_CATALOG.filter(
    (permission) => permission.grantToTenantAdmin !== false,
  ).map((permission) => permission.name);
