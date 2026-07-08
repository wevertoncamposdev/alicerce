import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';

interface RegisterAuditInput {
  tenantId?: string;
  userId?: string;
  action: string;
  entity: string;
  payload?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) { }

  async register({ tenantId, userId, action, entity, payload }: RegisterAuditInput) {
    if (!tenantId || !userId) {
      return;
    }

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        type: 'DATA_CHANGE',
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
