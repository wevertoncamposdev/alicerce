import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Prisma } from '@core/prisma/generated/client';

@Injectable()
export class TenantRepository {
    constructor(private readonly prisma: PrismaService) { }

    create(data: Prisma.TenantCreateInput) {
        return this.prisma.tenant.create({ data });
    }

    findMany() {
        return this.prisma.tenant.findMany();
    }

    findById(id: string) {
        return this.prisma.tenant.findUnique({ where: { id } });
    }

    updateById(id: string, data: Prisma.TenantUpdateInput) {
        return this.prisma.tenant.update({
            where: { id },
            data,
        });
    }

    deleteById(id: string) {
        return this.prisma.tenant.delete({ where: { id } });
    }

    search(where: Prisma.TenantWhereInput, skip: number, take: number) {
        return this.prisma.tenant.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
    }

    count(where: Prisma.TenantWhereInput) {
        return this.prisma.tenant.count({ where });
    }
}
