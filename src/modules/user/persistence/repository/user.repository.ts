import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { Prisma } from '@core/prisma/generated/prisma/client';

@Injectable()
export class UserRepository {
    constructor(private readonly prisma: PrismaService) { }

    create(data: Prisma.UserCreateInput) {
        return this.prisma.user.create({ data });
    }

    findManyActive() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
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

    softDeleteById(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                status: 'INACTIVE',
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

    findManyWithBirthDate() {
        return this.prisma.user.findMany({
            where: {
                deletedAt: null,
            },
        });
    }
}
