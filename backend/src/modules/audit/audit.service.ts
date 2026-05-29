import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async register({ tenantId, userId, action, entity, payload }: any) {
    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        type: 'DATA_CHANGE', // ou outro tipo conforme contexto
        action,
        entity,
        before: null,
        after: JSON.stringify(payload),
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.audit.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
