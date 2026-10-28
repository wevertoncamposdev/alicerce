import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '@core/prisma/generated/client';
import * as bcrypt from 'bcrypt';
import { syncPermissionCatalog } from '@core/authorization/permission-catalog-sync';
import {
  TERMS_DOCUMENT,
  CURRENT_TERMS_VERSION,
} from '@core/auth/legal-terms.constants';

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
      slug: 'tenant-exemplo',
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
        isSystem: true,
      },
    });
  }

  // Cria as permissões do catálogo que faltarem neste tenant e garante que
  // todo papel `isSystem` (o ADMIN acima) tenha todas as concedíveis —
  // substitui o loop manual de rolePermission que existia aqui antes.
  await syncPermissionCatalog(prisma);

  const passwordHash = await bcrypt.hash('admin123', 10);
  // D11 (docs/PLAN-fundacao-ux.md): sem emailVerifiedAt/ConsentRecord, os
  // dois banners de app/(app)/layout.tsx (e-mail não confirmado, termos
  // não aceitos) apareciam sempre em dev, mesmo logo após o seed.
  const user = await prisma.user.upsert({
    where: { email: 'admin@exemplo.com' },
    update: {
      password: passwordHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    create: {
      tenantId: tenant.id,
      email: 'admin@exemplo.com',
      password: passwordHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    include: { roles: true },
  });

  const consentExists = await prisma.consentRecord.findFirst({
    where: {
      userId: user.id,
      document: TERMS_DOCUMENT,
      version: CURRENT_TERMS_VERSION,
    },
  });

  if (!consentExists) {
    await prisma.consentRecord.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        document: TERMS_DOCUMENT,
        version: CURRENT_TERMS_VERSION,
      },
    });
  }

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
