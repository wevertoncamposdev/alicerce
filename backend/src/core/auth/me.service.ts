import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@core/prisma/prisma.service';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import { FilesService } from '@core/files/file.service';
import {
  revokeSessions as revokeSessionsUtil,
  RevokeSessionsScope,
} from './session-revocation.util';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';

export interface MeSessionItem {
  familyId: string;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  isCurrent: boolean;
}

const ME_SELECT = {
  id: true,
  email: true,
  name: true,
  theme: true,
  locale: true,
  avatarFileId: true,
} as const;

/**
 * Diferente de AuthService, aqui já existe um usuário autenticado com
 * tenant resolvido no request-context — por isso usa PrismaService normal
 * (tenant-scoped via RLS), não PrismaBootstrapService. Ver ADR 0008.
 */
@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  // Mesmo padrão de AuthService.refreshTokens: hash do cookie recebido →
  // familyId correspondente. Sem cookie ou sem match, retorna undefined —
  // não há como identificar "a sessão atual", mas isso não deve bloquear a
  // operação (ex.: trocar senha sem o cookie de refresh presente).
  private async resolveCurrentFamilyId(
    rawRefreshToken: string | undefined,
  ): Promise<string | undefined> {
    if (!rawRefreshToken) return undefined;

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: this.hashToken(rawRefreshToken) },
    });

    return storedToken?.familyId;
  }

  async getMe(userId: string, tenantId: string) {
    const user = findOneOrThrow(
      await this.prisma.user.findUnique({
        where: { id: userId },
        select: ME_SELECT,
      }),
      () => true,
      'Usuário não encontrado',
    );

    const avatarUrl = user.avatarFileId
      ? await this.filesService.getSignedUrlOrNull(user.avatarFileId, tenantId)
      : null;

    return { ...user, avatarUrl };
  }

  async updateMe(userId: string, tenantId: string, dto: UpdateMeDto) {
    if (dto.avatarFileId) {
      await this.filesService.assertUploadedBy(
        dto.avatarFileId,
        tenantId,
        userId,
      );
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: ME_SELECT,
    });

    const avatarUrl = user.avatarFileId
      ? await this.filesService.getSignedUrlOrNull(user.avatarFileId, tenantId)
      : null;

    return { ...user, avatarUrl };
  }

  async changePassword(
    userId: string,
    dto: ChangeMyPasswordDto,
    rawRefreshToken: string | undefined,
  ): Promise<void> {
    const user = findOneOrThrow(
      await this.prisma.user.findUnique({ where: { id: userId } }),
      () => true,
      'Usuário não encontrado',
    );

    // user.password só é null pra convite ainda não aceito (etapa 7.4) —
    // na prática inalcançável aqui (sem senha não tem como ter uma sessão
    // autenticada), mas o tipo exige a guarda mesmo assim.
    const isCurrentPasswordValid =
      user.password !== null &&
      (await bcrypt.compare(dto.currentPassword, user.password));

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const currentFamilyId = await this.resolveCurrentFamilyId(rawRefreshToken);
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newPasswordHash },
    });

    await this.revokeSessions(userId, { exceptFamilyId: currentFamilyId });
  }

  async listSessions(
    userId: string,
    rawRefreshToken: string | undefined,
  ): Promise<MeSessionItem[]> {
    const [tokens, currentFamilyId] = await Promise.all([
      this.prisma.refreshToken.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      }),
      this.resolveCurrentFamilyId(rawRefreshToken),
    ]);

    // Uma família pode ter mais de um token vivo durante a janela de
    // tolerância de reuso (ver AuthService.REFRESH_TOKEN_REUSE_GRACE_MS) —
    // mantém só o mais recente de cada família, resolvido em JS (lista
    // pequena por usuário; não vale a complexidade de um groupBy SQL).
    const latestByFamily = new Map<string, (typeof tokens)[number]>();
    for (const token of tokens) {
      if (!latestByFamily.has(token.familyId)) {
        latestByFamily.set(token.familyId, token);
      }
    }

    return [...latestByFamily.values()].map((token) => ({
      familyId: token.familyId,
      userAgent: token.userAgent,
      ip: token.ip,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      isCurrent: token.familyId === currentFamilyId,
    }));
  }

  async revokeSession(userId: string, familyId: string): Promise<void> {
    await this.revokeSessions(userId, { onlyFamilyId: familyId });
  }

  async revokeOtherSessions(
    userId: string,
    rawRefreshToken: string | undefined,
  ): Promise<void> {
    const currentFamilyId = await this.resolveCurrentFamilyId(rawRefreshToken);
    await this.revokeSessions(userId, { exceptFamilyId: currentFamilyId });
  }

  private async revokeSessions(
    userId: string,
    scope: RevokeSessionsScope,
  ): Promise<void> {
    await revokeSessionsUtil(this.prisma, userId, scope);
  }
}
