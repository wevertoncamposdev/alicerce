import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@core/prisma/prisma.service';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import { FilesService } from '@core/files/file.service';
import { MailService } from '@core/mail/mail.service';
import { AccountTokenService } from '@core/auth/account-token.service';
import { AuditService } from '@modules/audit/audit.service';
import { resolveTenantBranding } from '@core/mail/resolve-tenant-branding.util';
import { renderAccountEmail } from '@core/mail/templates/account-email.template';
import {
  revokeSessions as revokeSessionsUtil,
  RevokeSessionsScope,
} from './session-revocation.util';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangeMyPasswordDto } from './dto/change-my-password.dto';
import { CURRENT_TERMS_VERSION, TERMS_DOCUMENT } from './legal-terms.constants';

const CHANGE_EMAIL_TTL_MS = 60 * 60 * 1000; // 1h

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
    private readonly accountTokenService: AccountTokenService,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
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

  // Etapa 9.2 (LGPD) — "exportar meus dados". Escopo deliberadamente
  // restrito ao que já vive em core/auth (perfil, sessões, consentimentos)
  // mais um resumo da própria atividade de auditoria (ver
  // AuditService.findAllByUserId) — nunca dados de outro usuário nem o
  // conteúdo de módulos de domínio, que este serviço não conhece.
  async exportMyData(userId: string, tenantId: string) {
    const [profile, sessions, consents, activity] = await Promise.all([
      this.getMe(userId, tenantId),
      this.listSessions(userId, undefined),
      this.prisma.consentRecord.findMany({
        where: { userId },
        select: { document: true, version: true, acceptedAt: true, ip: true },
        orderBy: { acceptedAt: 'desc' },
      }),
      this.auditService.findAllByUserId(tenantId, userId),
    ]);

    return { profile, sessions, consents, activity };
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

  // Troca de e-mail (etapa 7.6): o e-mail só muda de fato quando o link
  // mandado pro endereço NOVO é confirmado (AuthService.confirmEmailChange)
  // — aqui só emite o token e avisa as duas caixas. `User.email` é
  // `@unique` global, por isso a checagem de duplicidade não precisa de
  // tenantId.
  async changeEmail(
    userId: string,
    tenantId: string,
    newEmail: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });
    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail');
    }

    const user = findOneOrThrow(
      await this.prisma.user.findUnique({ where: { id: userId } }),
      () => true,
      'Usuário não encontrado',
    );

    const tenant = findOneOrThrow(
      await this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      () => true,
      'Tenant não encontrado',
    );

    const rawToken = await this.accountTokenService.issue({
      userId,
      tenantId,
      type: 'CHANGE_EMAIL',
      ttlMs: CHANGE_EMAIL_TTL_MS,
      newEmail,
    });

    const { tenantName, tenantLogoUrl } = await resolveTenantBranding(
      this.filesService,
      tenant,
    );

    const { html, text } = renderAccountEmail({
      title: 'Confirme seu novo e-mail',
      bodyText:
        'Recebemos um pedido para trocar o e-mail da sua conta. Clique no botão abaixo para confirmar este novo endereço.',
      tenantName,
      tenantLogoUrl,
      actionUrl: `${process.env.FRONTEND_URL}/auth/confirm-email-change?token=${rawToken}`,
      actionLabel: 'Confirmar novo e-mail',
    });
    await this.mailService.send({
      to: newEmail,
      subject: 'Confirme seu novo e-mail',
      html,
      text,
    });

    // Aviso informativo pro e-mail antigo — sem link, só pra avisar caso
    // não tenha sido o próprio usuário a pedir a troca.
    const { html: oldHtml, text: oldText } = renderAccountEmail({
      title: 'Pedido de troca de e-mail',
      bodyText: `Alguém pediu a troca do e-mail da sua conta para ${newEmail}. Se não foi você, contate o suporte.`,
      tenantName,
      tenantLogoUrl,
    });
    await this.mailService.send({
      to: user.email,
      subject: 'Pedido de troca de e-mail',
      html: oldHtml,
      text: oldText,
    });
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

  // Etapa 9.1 (LGPD) — aceite dos termos quando a versão atual mudou desde
  // o cadastro. Tenant-scoped via RLS (this.prisma), igual ao resto deste
  // service — ver comentário da classe sobre ADR 0008.
  async acceptCurrentTerms(
    userId: string,
    tenantId: string,
    ip: string | undefined,
  ): Promise<void> {
    await this.prisma.consentRecord.create({
      data: {
        tenantId,
        userId,
        document: TERMS_DOCUMENT,
        version: CURRENT_TERMS_VERSION,
        ip,
      },
    });
  }
}
