// favorite-notes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/core/prisma/prisma.service';
import { CreateFavoriteNoteDto } from './dto/create-favorite-note.dto';

@Injectable()
export class FavoriteNotesService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(favoriteId: string, tenantId: string) {
        return this.prisma.favoriteNote.findMany({
            where: { favoriteId, tenantId },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, email: true } } },
        });
    }

    async create(favoriteId: string, dto: CreateFavoriteNoteDto, tenantId: string, userSub: string) {
        return this.prisma.favoriteNote.create({
            data: {
                content: dto.content,
                favoriteId,
                tenantId,
                userId: userSub,
            },
            include: { user: { select: { id: true, email: true } } },
        });
    }

    async remove(id: string, tenantId: string) {
        const note = await this.prisma.favoriteNote.findUnique({ where: { id } });
        if (!note || note.tenantId !== tenantId) {
            throw new Error('Nota não encontrada ou acesso negado');
        }
        return this.prisma.favoriteNote.delete({ where: { id } });
    }
}