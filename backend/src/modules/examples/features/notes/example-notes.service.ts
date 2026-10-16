// example-notes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/core/prisma/prisma.service';
import { CreateExampleNoteDto } from './dto/create-example-note.dto';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';

@Injectable()
export class ExampleNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(exampleId: string, tenantId: string) {
    return this.prisma.exampleNote.findMany({
      where: { exampleId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async create(
    exampleId: string,
    dto: CreateExampleNoteDto,
    tenantId: string,
    userSub: string,
  ) {
    return this.prisma.exampleNote.create({
      data: {
        content: dto.content,
        exampleId,
        tenantId,
        userId: userSub,
      },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async remove(id: string, tenantId: string) {
    const note = findOneOrThrow(
      await this.prisma.exampleNote.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      'Nota não encontrada ou acesso negado',
    );

    return this.prisma.exampleNote.delete({ where: { id: note.id } });
  }
}
