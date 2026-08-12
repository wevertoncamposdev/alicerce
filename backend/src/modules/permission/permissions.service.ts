import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.permission.findMany({
            where: {
                tenantId,
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(dto: CreatePermissionDto) {
        return this.prisma.permission.create({
            data: {
                tenantId: dto.tenantId,
                name: dto.name,
                type: dto.type,
                resource: dto.resource,
                description: dto.description,
            },
        });
    }

    async update(id: string, dto: UpdatePermissionDto) {
        const existing = await this.prisma.permission.findUnique({ where: { id } });

        if (!existing || existing.deletedAt) {
            throw new NotFoundException('Permissao nao encontrada');
        }

        return this.prisma.permission.update({
            where: { id },
            data: {
                name: dto.name,
                type: dto.type,
                resource: dto.resource,
                description: dto.description,
            },
        });
    }

    async remove(id: string) {
        const existing = await this.prisma.permission.findUnique({ where: { id } });

        if (!existing || existing.deletedAt) {
            throw new NotFoundException('Permissao nao encontrada');
        }

        return this.prisma.permission.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    }
}
