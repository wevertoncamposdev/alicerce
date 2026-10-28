import { randomUUID } from 'crypto';

/**
 * Fábricas de fixtures para os e2e com `MockPrisma`. Extraem os literais de
 * tenant/usuário/papel/permissão que cada spec digitava à mão (ver
 * user-tenant-isolation, feedback-tenant-isolation, roles.attach-detach).
 */

export function buildTenantId(): string {
  return randomUUID();
}

export interface MockUser {
  id: string;
  tenantId: string;
  email: string;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function buildUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: randomUUID(),
    tenantId: buildTenantId(),
    email: `${randomUUID()}@example.com`,
    status: 'ACTIVE',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface MockRole {
  id: string;
  tenantId: string;
  deletedAt: Date | null;
}

export function buildRole(overrides: Partial<MockRole> = {}): MockRole {
  return {
    id: randomUUID(),
    tenantId: buildTenantId(),
    deletedAt: null,
    ...overrides,
  };
}

export interface MockPermission {
  id: string;
  tenantId: string;
  deletedAt: Date | null;
}

export function buildPermission(
  overrides: Partial<MockPermission> = {},
): MockPermission {
  return {
    id: randomUUID(),
    tenantId: buildTenantId(),
    deletedAt: null,
    ...overrides,
  };
}
