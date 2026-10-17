import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';

@Injectable()
export class FeedbackCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(feedbackId: string, tenantId: string) {
    return this.prisma.feedbackComment.findMany({
      where: { feedbackId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async create(
    feedbackId: string,
    dto: CreateFeedbackCommentDto,
    tenantId: string,
    userSub: string,
  ) {
    return this.prisma.feedbackComment.create({
      data: {
        content: dto.content,
        feedbackId,
        tenantId,
        userId: userSub,
      },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async remove(id: string, tenantId: string) {
    const comment = findOneOrThrow(
      await this.prisma.feedbackComment.findUnique({ where: { id } }),
      (entry) => entry.tenantId === tenantId,
      'Comentário não encontrado ou acesso negado',
    );

    return this.prisma.feedbackComment.delete({ where: { id: comment.id } });
  }
}
