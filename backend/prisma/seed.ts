import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from '@core/prisma/generated/client';
import * as bcrypt from 'bcrypt';
import {
  PERMISSION_CATALOG,
  TENANT_ADMIN_PERMISSION_NAMES,
} from '@core/authorization/permission-catalog';

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

  const permissionSeeds: Prisma.PermissionCreateManyInput[] =
    PERMISSION_CATALOG.map((permission) => ({
      tenantId: tenant.id,
      name: permission.name,
      type: permission.type,
      resource: permission.resource,
      description: permission.description,
    }));

  await prisma.permission.createMany({
    data: permissionSeeds,
    skipDuplicates: true,
  });

  const tenantAdminPermissions = await prisma.permission.findMany({
    where: { tenantId: tenant.id, name: { in: [...TENANT_ADMIN_PERMISSION_NAMES] } },
  });
  for (const permission of tenantAdminPermissions) {
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
    where: { email: 'admin@exemplo.com' },
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
