import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from '@core/prisma/generated/client';
import * as bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'tenant-exemplo' },
    update: {},
    create: {
      legalName: 'Tenant Exemplo',
      tradeName: 'Tenant Exemplo',
      registrationNumber: '12345678000199',
      slug: 'tenant-exemplo',
      category: 'ASSOCIATION',
      primaryServiceArea: 'EDUCATION',
      partnershipType: 'NONE',
      status: 'ACTIVE',
    },
  });

  let adminRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, name: 'ADMIN' },
  });

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: 'ADMIN',
        type: 'ADMIN',
        description: 'Administrador do sistema',
        status: 'ACTIVE',
      },
    });
  }

  const permissionSeeds: Prisma.PermissionCreateManyInput[] = [
    { tenantId: tenant.id, name: 'user.create', type: 'WRITE', resource: 'users', description: 'Criar usuários' },
    { tenantId: tenant.id, name: 'user.read', type: 'READ', resource: 'users', description: 'Consultar usuários' },
    { tenantId: tenant.id, name: 'user.update', type: 'WRITE', resource: 'users', description: 'Atualizar usuários' },
    { tenantId: tenant.id, name: 'user.delete', type: 'DELETE', resource: 'users', description: 'Remover usuários' },
    { tenantId: tenant.id, name: 'role.create', type: 'WRITE', resource: 'roles', description: 'Criar papéis' },
    { tenantId: tenant.id, name: 'role.read', type: 'READ', resource: 'roles', description: 'Consultar papéis' },
    { tenantId: tenant.id, name: 'role.update', type: 'WRITE', resource: 'roles', description: 'Atualizar papéis' },
    { tenantId: tenant.id, name: 'role.delete', type: 'DELETE', resource: 'roles', description: 'Remover papéis' },
    { tenantId: tenant.id, name: 'role.assign', type: 'WRITE', resource: 'roles', description: 'Gerenciar associação de papéis' },
    { tenantId: tenant.id, name: 'permission.create', type: 'WRITE', resource: 'permissions', description: 'Criar permissões' },
    { tenantId: tenant.id, name: 'permission.read', type: 'READ', resource: 'permissions', description: 'Consultar permissões' },
    { tenantId: tenant.id, name: 'permission.update', type: 'WRITE', resource: 'permissions', description: 'Atualizar permissões' },
    { tenantId: tenant.id, name: 'permission.delete', type: 'DELETE', resource: 'permissions', description: 'Remover permissões' },
    { tenantId: tenant.id, name: 'favorite.create', type: 'WRITE', resource: 'favorites', description: 'Criar favoritos' },
    { tenantId: tenant.id, name: 'favorite.read', type: 'READ', resource: 'favorites', description: 'Consultar favoritos' },
    { tenantId: tenant.id, name: 'favorite.update', type: 'WRITE', resource: 'favorites', description: 'Atualizar favoritos' },
    { tenantId: tenant.id, name: 'favorite.delete', type: 'DELETE', resource: 'favorites', description: 'Remover favoritos' },
  ];

  await prisma.permission.createMany({
    data: permissionSeeds,
    skipDuplicates: true,
  });

  const allPermissions = await prisma.permission.findMany({ where: { tenantId: tenant.id } });
  for (const permission of allPermissions) {
    const exists = await prisma.rolePermission.findFirst({
      where: {
        tenantId: tenant.id,
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });

    if (!exists) {
      await prisma.rolePermission.create({
        data: {
          tenantId: tenant.id,
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@exemplo.com' } },
    update: {
      password: passwordHash,
      status: 'ACTIVE',
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@exemplo.com',
      password: passwordHash,
      status: 'ACTIVE',
    },
    include: { roles: true },
  });

  const userRoleExists = await prisma.userRole.findFirst({
    where: {
      tenantId: tenant.id,
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  if (!userRoleExists) {
    await prisma.userRole.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: adminRole.id,
      },
    });
  }

  console.log('Seed concluído!');
  console.log({ tenant, user, role: adminRole });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
