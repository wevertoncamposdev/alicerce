import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { AuditType } from '@core/prisma/generated/enums';

interface RegisterAuditInput {
  tenantId?: string;
  userId?: string;
  type?: AuditType;
  action: string;
  entity: string;
  entityId?: string;
  before?: unknown;
  payload?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async register({
    tenantId,
    userId,
    type,
    action,
    entity,
    entityId,
    before,
    payload,
  }: RegisterAuditInput) {
    if (!tenantId || !userId) {
      return;
    }

    await this.prisma.audit.create({
      data: {
        tenantId,
        userId,
        type: type ?? 'DATA_CHANGE',
        action,
        entity,
        entityId,
        before: before !== undefined ? JSON.stringify(before) : null,
        after: JSON.stringify(payload),
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: { entity?: string; entityId?: string },
  ) {
    const response = await this.prisma.audit.findMany({
      where: {
        tenantId,
        ...(filters?.entity ? { entity: filters.entity } : {}),
        ...(filters?.entityId ? { entityId: filters.entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true }, // nunca inclua "password" aqui
        },
        tenant: {
          select: { id: true, legalName: true },
        },
      },
    });
    return response;
  }
}
