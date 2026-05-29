import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '@core/prisma/generated/client';
import * as bcrypt from 'bcrypt';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Cria um tenant
  const tenant = await prisma.tenant.create({
    data: {
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

  // 2. Cria uma role ADMIN
  const role = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'ADMIN',
      type: 'ADMIN',
      description: 'Administrador do sistema',
      status: 'ACTIVE',
    },
  });

  // 3. Cria permissões básicas
  const permissions = await prisma.permission.createMany({
    data: [
      { tenantId: tenant.id, name: 'user.create', type: 'WRITE' },
      { tenantId: tenant.id, name: 'user.read', type: 'READ' },
      { tenantId: tenant.id, name: 'user.update', type: 'WRITE' },
      { tenantId: tenant.id, name: 'user.delete', type: 'DELETE' },
    ],
  });

  // 4. Relaciona permissões à role ADMIN
  const allPermissions = await prisma.permission.findMany({ where: { tenantId: tenant.id } });
  for (const permission of allPermissions) {
    await prisma.rolePermission.create({
      data: {
        tenantId: tenant.id,
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }

  // 5. Cria um usuário admin
  const passwordHash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@exemplo.com',
      password: passwordHash,
      status: 'ACTIVE',
      roles: {
        create: [{ roleId: role.id, tenantId: tenant.id }],
      },
    },
    include: { roles: true },
  });

  console.log('Seed concluído!');
  console.log({ tenant, user });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
