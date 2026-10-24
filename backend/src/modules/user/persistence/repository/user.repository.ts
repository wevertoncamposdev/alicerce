import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Prisma } from '@core/prisma/generated/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  findManyActive(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        tenantId,
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  updateById(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  // Etapa 9.3 (LGPD) — exclusão anonimiza em vez de apagar a linha: mantém
  // vínculos (UserRole, Audit, Feedback...) e a trilha de auditoria, mas
  // libera o e-mail original pra reuso. `email` determinístico a partir do
  // id (nunca colide, nunca precisa de retry).
  anonymizeById(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
        name: null,
        email: `deleted-${id}@anon.invalid`,
      },
    });
  }

  countActive() {
    return this.prisma.user.count({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });
  }

  search(where: Prisma.UserWhereInput, skip: number, take: number) {
    return this.prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(where: Prisma.UserWhereInput) {
    return this.prisma.user.count({ where });
  }
}
