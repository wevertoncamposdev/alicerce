import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Prisma } from '@core/prisma/generated/client';

@Injectable()
export class RoleRepository {
    constructor(private readonly prisma: PrismaService) { }

    create(data: Prisma.RoleCreateInput) {
        return this.prisma.role.create({ data });
    }

    findMany() {
        return this.prisma.role.findMany();
    }

    findById(id: string) {
        return this.prisma.role.findUnique({ where: { id } });
    }

    updateById(id: string, data: Prisma.RoleUpdateInput) {
        return this.prisma.role.update({
            where: { id },
            data,
        });
    }

    deleteById(id: string) {
        return this.prisma.role.delete({ where: { id } });
    }

    search(where: Prisma.RoleWhereInput, skip: number, take: number) {
        return this.prisma.role.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
    }

    count(where: Prisma.RoleWhereInput) {
        return this.prisma.role.count({ where });
    }
}
