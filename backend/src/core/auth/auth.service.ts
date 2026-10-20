import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from './dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaBootstrapService } from '@core/prisma/prisma-bootstrap.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RedisService } from '@core/redis/redis.service';
import { AuditService } from '@modules/audit/audit.service';
import { SignUpPublicDto } from './dto/sign-up-public.dto';
import { RoleType } from '@core/prisma/generated/enums';
import { I18nService } from 'nestjs-i18n';
import {
  PERMISSION_CATALOG,
  TENANT_ADMIN_PERMISSION_NAMES,
} from '@core/authorization/permission-catalog';
import { AccountTokenService } from './account-token.service';
import { revokeSessions } from './session-revocation.util';
import { MailService } from '@core/mail/mail.service';
import { FilesService } from '@core/files/file.service';
import { resolveTenantBranding } from '@core/mail/resolve-tenant-branding.util';
import { renderAccountEmail } from '@core/mail/templates/account-email.template';

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface AuthUserContext {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  permissions: string[];
  emailVerified: boolean;
}

export interface AuthSessionResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUserContext;
  tenant: {
    id: string;
    legalName: string;
    slug: string;
  };
}

// Duração do refresh token: 7 dias em ms
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Janela de tolerância para reuso de refresh token já revogado: cobre
// requisições paralelas (duas abas, retry de rede) que chegam quase juntas
// e tentam rotacionar o mesmo token. Fora dessa janela, reuso é tratado
// como roubo de token.
const REFRESH_TOKEN_REUSE_GRACE_MS = 10 * 1000;

// Hash fixo (calculado uma única vez, no load do módulo) usado só para
// gastar o mesmo tempo de bcrypt.compare quando o e-mail não existe — ver
// AuthService.signIn. Nunca corresponde a nenhuma senha real.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'alicerce-timing-safety-dummy-value',
  10,
);

// Bloqueio por conta (além do throttle por IP já existente no controller):
// 5 falhas em 15 min bloqueiam qualquer tentativa pelo mesmo e-mail.
const LOGIN_LOCKOUT_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class AuthService {
  constructor(
    // Role owner (ignora RLS) — ver PrismaBootstrapService: todas as
    // consultas deste service são inerentemente cross-tenant (login por
    // email, refresh token por hash, criação do tenant no signup).
    private readonly prismaBootstrap: PrismaBootstrapService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly permissionCache: PermissionCacheService,
    private readonly auditService: AuditService,
    private readonly redis: RedisService,
    private readonly accountTokenService: AccountTokenService,
    private readonly mailService: MailService,
    private readonly filesService: FilesService,
  ) {}

  private loginLockoutKey(email: string): string {
    return `login:fail:${email}`;
  }

  // Fallback gracioso: Redis indisponível não bloqueia login (cai pro
  // throttle por IP, que já existe) — mesmo padrão de
  // PermissionCacheService.invalidateUser.
  private async isAccountLockedOut(email: string): Promise<boolean> {
    try {
      const attempts = await this.redis.client.get(this.loginLockoutKey(email));
      return (
        attempts !== null && Number(attempts) >= LOGIN_LOCKOUT_MAX_ATTEMPTS
      );
    } catch {
      return false;
    }
  }

  private async recordFailedLoginAttempt(email: string): Promise<void> {
    try {
      const key = this.loginLockoutKey(email);
      const attempts = await this.redis.client.incr(key);
      if (attempts === 1) {
        await this.redis.client.expire(key, LOGIN_LOCKOUT_WINDOW_SECONDS);
      }
    } catch {
      // Best-effort: sem contador, o login segue protegido só pelo throttle
      // por IP.
    }
  }

  private async clearFailedLoginAttempts(email: string): Promise<void> {
    try {
      await this.redis.client.del(this.loginLockoutKey(email));
    } catch {
      // Nada a fazer — a chave expira sozinha em 15min de qualquer forma.
    }
  }

  private async getAuthUserByEmail(email: string) {
    return this.prismaBootstrap.user.findUnique({
      where: { email },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private async getAuthUserById(id: string) {
    return this.prismaBootstrap.user.findUnique({
      where: { id },
      include: {
        tenant: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // Usuário excluído/inativo ou tenant excluído/inativo não pode autenticar
  // nem renovar sessão, mesmo com credenciais/refresh token válidos.
  private isUserOrTenantBlocked(
    user: NonNullable<Awaited<ReturnType<AuthService['getAuthUserById']>>>,
  ): boolean {
    return (
      user.deletedAt !== null ||
      user.status !== 'ACTIVE' ||
      user.tenant.deletedAt !== null ||
      user.tenant.status !== 'ACTIVE'
    );
  }

  private async mapAuthUserContext(
    user: NonNullable<Awaited<ReturnType<AuthService['getAuthUserById']>>>,
  ) {
    const permissionNames = Array.from(
      new Set(
        user.roles.flatMap((item) =>
          item.role.permissions.map((permission) => permission.permission.name),
        ),
      ),
    );

    const authUserContext: AuthUserContext = {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      permissions: permissionNames,
      emailVerified: user.emailVerifiedAt !== null,
    };

    // Popula o cache de permissões já aqui (ver P7.5/PermissionCacheService)
    // — evita um miss garantido na primeira requisição autenticada da sessão.
    await this.permissionCache.setPermissions(
      user.tenantId,
      user.id,
      permissionNames,
    );

    return authUserContext;
  }

  private async signToken(user: AuthUserContext): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      username: user.email,
      tenantId: user.tenantId,
      permissions: user.permissions,
    });
  }

  /**
   * Gera um token opaco aleatório (não JWT), persiste o HASH no banco e
   * devolve o token em claro — que vai para o cookie httpOnly via BFF.
   *
   * familyId: identifica a "linhagem" de uma sessão. Ao fazer refresh,
   * todos os novos tokens herdam o mesmo familyId. Se detectarmos reuso
   * de um token já consumido, revogamos toda a família de uma vez.
   */
  private async createRefreshToken({
    userId,
    tenantId,
    familyId,
    userAgent,
    ip,
  }: {
    userId: string;
    tenantId: string;
    familyId: string;
  } & SessionMeta): Promise<string> {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    await this.prismaBootstrap.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        tenantId,
        familyId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        userAgent,
        ip,
        lastUsedAt: new Date(),
      },
    });

    return rawToken;
  }

  /**
   * Valida o refresh token recebido e emite um novo par (access + refresh).
   *
   * Fluxo:
   * 1. Hash do token recebido → busca no banco.
   * 2. Token não existe / revogado / expirado → 401.
   * 3. Token já foi consumido antes (revokedAt preenchido mas ainda no banco)
   *    → REUSO DETECTADO → revoga toda a família → 401.
   * 4. Marca o token atual como revogado.
   * 5. Emite novo par com o mesmo familyId.
   */
  async refreshTokens(
    rawToken: string,
    meta?: SessionMeta,
  ): Promise<AuthSessionResponse> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const storedToken = await this.prismaBootstrap.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    // Token inexistente ou expirado
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (storedToken.revokedAt !== null) {
      const revokedWithinGraceWindow =
        Date.now() - storedToken.revokedAt.getTime() <
        REFRESH_TOKEN_REUSE_GRACE_MS;

      // Dentro da janela de tolerância: provável corrida de requisições
      // paralelas que rotacionaram o mesmo token quase ao mesmo tempo (não é
      // reuso malicioso). Deixa passar e emite um novo par normalmente,
      // sem punir a família nem revogar de novo o token já revogado.
      if (!revokedWithinGraceWindow) {
        // ⚠️  Reuso fora da janela de tolerância: o token já tinha sido
        // revogado há tempo e alguém está tentando usá-lo de novo. Isso
        // indica que o token pode ter sido roubado. A decisão mais segura
        // é revogar toda a família — forçando novo login para todos.
        await this.prismaBootstrap.refreshToken.updateMany({
          where: { familyId: storedToken.familyId },
          data: { revokedAt: new Date() },
        });
        throw new UnauthorizedException(
          'Sessão inválida. Faça login novamente.',
        );
      }
    } else {
      // Revoga o token atual antes de emitir o próximo
      await this.prismaBootstrap.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }

    const user = await this.getAuthUserById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (this.isUserOrTenantBlocked(user)) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }

    const mappedUser = await this.mapAuthUserContext(user);
    const [access_token, refresh_token] = await Promise.all([
      this.signToken(mappedUser),
      // Herda o mesmo familyId — a "linhagem" da sessão original
      this.createRefreshToken({
        userId: user.id,
        tenantId: user.tenantId,
        familyId: storedToken.familyId,
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      }),
    ]);

    return {
      access_token,
      refresh_token,
      user: mappedUser,
      tenant: {
        id: user.tenant.id,
        legalName: user.tenant.legalName,
        slug: user.tenant.slug,
      },
    };
  }

  /**
   * Revoga toda a família do refresh token recebido.
   * Isso garante que tokens roubados antes do logout não continuem válidos.
   */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const storedToken = await this.prismaBootstrap.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    if (!storedToken) return; // Token inválido — logout silencioso

    await this.prismaBootstrap.refreshToken.updateMany({
      where: { familyId: storedToken.familyId },
      data: { revokedAt: new Date() },
    });
  }

  async signUpPublic(
    dto: SignUpPublicDto,
    meta?: SessionMeta,
  ): Promise<AuthSessionResponse> {
    const existingByEmail = await this.prismaBootstrap.user.findUnique({
      where: { email: dto.email },
    });

    if (existingByEmail) {
      throw new ConflictException('Ja existe usuario com este email');
    }

    const existingBySlug = await this.prismaBootstrap.tenant.findFirst({
      where: { slug: dto.tenantSlug },
    });

    if (existingBySlug) {
      throw new ConflictException('Ja existe tenant com este slug');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prismaBootstrap.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          legalName: dto.tenantName,
          slug: dto.tenantSlug,
          status: 'ACTIVE',
        },
      });

      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'ADMIN',
          type: RoleType.ADMIN,
          description: 'Administrador inicial do tenant',
          status: 'ACTIVE',
          isSystem: true,
        },
      });

      await tx.permission.createMany({
        data: PERMISSION_CATALOG.map((permission) => ({
          tenantId: tenant.id,
          name: permission.name,
          type: permission.type,
          resource: permission.resource,
          description: permission.description,
        })),
        skipDuplicates: true,
      });

      const permissions = await tx.permission.findMany({
        where: {
          tenantId: tenant.id,
          name: { in: [...TENANT_ADMIN_PERMISSION_NAMES] },
        },
      });

      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          tenantId: tenant.id,
          roleId: role.id,
          permissionId: permission.id,
          resource: null,
        })),
        skipDuplicates: true,
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          name: dto.name,
          password: passwordHash,
          status: 'ACTIVE',
        },
      });

      await tx.userRole.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: role.id,
        },
      });

      return { userId: user.id, tenant };
    });

    const user = await this.getAuthUserById(created.userId);

    if (!user) {
      throw new UnauthorizedException('Falha ao carregar sessao de onboarding');
    }

    await this.sendVerifyEmail(user);

    const mappedUser = await this.mapAuthUserContext(user);
    const familyId = crypto.randomUUID();
    const [access_token, refresh_token] = await Promise.all([
      this.signToken(mappedUser),
      this.createRefreshToken({
        userId: user.id,
        tenantId: user.tenantId,
        familyId,
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      }),
    ]);

    return {
      access_token,
      refresh_token,
      user: mappedUser,
      tenant: {
        id: user.tenant.id,
        legalName: user.tenant.legalName,
        slug: user.tenant.slug,
      },
    };
  }

  async signIn(
    signInDto: SignInDto,
    meta?: SessionMeta,
  ): Promise<AuthSessionResponse> {
    const user = await this.getAuthUserByEmail(signInDto.email);

    if (await this.isAccountLockedOut(signInDto.email)) {
      if (user) {
        void this.auditService
          .register({
            tenantId: user.tenantId,
            userId: user.id,
            type: 'LOGIN_FAILED',
            action: 'POST',
            entity: 'auth',
            payload: { reason: 'account_locked' },
          })
          .catch(() => {
            // Auditoria não deve interromper o fluxo de login (nem seu erro).
          });
      }

      // Mesma mensagem genérica — nunca "conta bloqueada", que revelaria
      // que o e-mail existe.
      const message = this.i18n.translate('messages.USER.INVALID_CREDENTIALS', {
        lang: 'pt-BR',
      });
      throw new UnauthorizedException(message);
    }

    if (!user) {
      // Mesmo tempo de resposta e mesma mensagem de uma senha errada: sem
      // isso, o tempo do bcrypt.compare real denunciaria se o e-mail existe.
      await bcrypt.compare(signInDto.password, DUMMY_PASSWORD_HASH);
      await this.recordFailedLoginAttempt(signInDto.email);

      const message = this.i18n.translate('messages.USER.INVALID_CREDENTIALS', {
        lang: 'pt-BR',
      });
      throw new UnauthorizedException(message);
    }

    // Convite ainda não aceito (etapa 7.4): `password === null`, nunca
    // chama bcrypt.compare com null — mas sempre chama bcrypt.compare com
    // ALGUM hash, pra gastar o mesmo tempo do caso de senha errada.
    const isPasswordValid =
      user.password !== null &&
      (await bcrypt.compare(signInDto.password, user.password));

    if (user.password === null) {
      await bcrypt.compare(signInDto.password, DUMMY_PASSWORD_HASH);
    }

    if (!isPasswordValid) {
      await this.recordFailedLoginAttempt(signInDto.email);

      // Diferente de um 401 genérico (token ausente/inválido): aqui o
      // usuário foi encontrado, então há tenantId/userId pra atribuir o
      // evento — ver AuditType.LOGIN_FAILED. E-mail inexistente (branch
      // acima) continua sem auditoria: não há tenant a quem atribuir.
      void this.auditService
        .register({
          tenantId: user.tenantId,
          userId: user.id,
          type: 'LOGIN_FAILED',
          action: 'POST',
          entity: 'auth',
        })
        .catch(() => {
          // Auditoria não deve interromper o fluxo de login (nem seu erro).
        });

      const message = this.i18n.translate('messages.USER.INVALID_CREDENTIALS', {
        lang: 'pt-BR',
      });
      throw new UnauthorizedException(message);
    }

    await this.clearFailedLoginAttempts(signInDto.email);

    if (this.isUserOrTenantBlocked(user)) {
      // Senha correta, mas conta/tenant desativado ou excluído: mesma
      // auditoria e mesma mensagem genérica da senha errada — não damos
      // nenhuma pista de que a senha estava certa.
      void this.auditService
        .register({
          tenantId: user.tenantId,
          userId: user.id,
          type: 'LOGIN_FAILED',
          action: 'POST',
          entity: 'auth',
        })
        .catch(() => {
          // Auditoria não deve interromper o fluxo de login (nem seu erro).
        });

      const message = this.i18n.translate('messages.USER.INVALID_CREDENTIALS', {
        lang: 'pt-BR',
      });
      throw new UnauthorizedException(message);
    }

    const mappedUser = await this.mapAuthUserContext(user);
    const familyId = crypto.randomUUID();
    const [access_token, refresh_token] = await Promise.all([
      this.signToken(mappedUser),
      this.createRefreshToken({
        userId: user.id,
        tenantId: user.tenantId,
        familyId,
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      }),
    ]);

    return {
      access_token,
      refresh_token,
      user: mappedUser,
      tenant: {
        id: user.tenant.id,
        legalName: user.tenant.legalName,
        slug: user.tenant.slug,
      },
    };
  }

  async getProfile(userId: string): Promise<AuthUserContext> {
    const user = await this.getAuthUserById(userId);

    if (!user) {
      throw new UnauthorizedException('Sessao invalida');
    }

    return this.mapAuthUserContext(user);
  }

  /**
   * Sempre devolve void (sem indicar se o e-mail existe) — a resposta no
   * controller é idêntica nos dois casos (Plano Base.md 7.3). Só manda o
   * e-mail se o usuário existir e a conta/tenant estiverem ativos.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.getAuthUserByEmail(email);

    if (!user || this.isUserOrTenantBlocked(user)) {
      return;
    }

    const rawToken = await this.accountTokenService.issue({
      userId: user.id,
      tenantId: user.tenantId,
      type: 'RESET_PASSWORD',
      ttlMs: 60 * 60 * 1000, // 1h
      // Rota @Public() — sem tenant no AsyncLocalStorage, a RLS da
      // AccountToken bloquearia o insert via PrismaService (ver
      // account-token.service.ts). PrismaBootstrapService é a mesma role
      // de owner que o resto desta classe já usa pros seus próprios
      // acessos cross-tenant.
      client: this.prismaBootstrap,
    });

    const { tenantName, tenantLogoUrl } = await resolveTenantBranding(
      this.filesService,
      user.tenant,
    );
    const { html, text } = renderAccountEmail({
      title: 'Redefinir sua senha',
      bodyText:
        'Recebemos um pedido para redefinir a senha da sua conta. Se foi você, clique no botão abaixo. Se não foi, pode ignorar este e-mail.',
      tenantName,
      tenantLogoUrl,
      actionUrl: `${process.env.FRONTEND_URL}/auth/reset-password?token=${rawToken}`,
      actionLabel: 'Redefinir senha',
    });

    await this.mailService.send({
      to: user.email,
      subject: 'Redefinir sua senha',
      html,
      text,
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const token = await this.accountTokenService.consume(
      rawToken,
      'RESET_PASSWORD',
      this.prismaBootstrap,
    );

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prismaBootstrap.user.update({
      where: { id: token.userId },
      data: { password: passwordHash },
    });

    await revokeSessions(this.prismaBootstrap, token.userId, { all: true });
  }

  // Convite de usuário (etapa 7.4) — define a senha pela primeira vez.
  // Não loga automaticamente: "convite → aceite → login" no Plano Base é
  // sequencial, o usuário faz login normal depois em /auth/login.
  async acceptInvite(rawToken: string, password: string): Promise<void> {
    const token = await this.accountTokenService.consume(
      rawToken,
      'INVITE',
      this.prismaBootstrap,
    );

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prismaBootstrap.user.update({
      where: { id: token.userId },
      data: { password: passwordHash },
    });
  }

  // Verificação de e-mail no cadastro (etapa 7.5) — manda o e-mail depois
  // que signUpPublic já criou tenant+usuário; rota @Public(), mesmo motivo
  // de client explícito do forgotPassword acima.
  private async sendVerifyEmail(
    user: NonNullable<Awaited<ReturnType<AuthService['getAuthUserById']>>>,
  ): Promise<void> {
    const rawToken = await this.accountTokenService.issue({
      userId: user.id,
      tenantId: user.tenantId,
      type: 'VERIFY_EMAIL',
      ttlMs: 24 * 60 * 60 * 1000, // 24h
      client: this.prismaBootstrap,
    });

    const { tenantName, tenantLogoUrl } = await resolveTenantBranding(
      this.filesService,
      user.tenant,
    );
    const { html, text } = renderAccountEmail({
      title: 'Confirme seu e-mail',
      bodyText: 'Confirme seu endereço de e-mail para concluir o cadastro.',
      tenantName,
      tenantLogoUrl,
      actionUrl: `${process.env.FRONTEND_URL}/auth/verify-email?token=${rawToken}`,
      actionLabel: 'Confirmar e-mail',
    });

    await this.mailService.send({
      to: user.email,
      subject: 'Confirme seu e-mail',
      html,
      text,
    });
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const token = await this.accountTokenService.consume(
      rawToken,
      'VERIFY_EMAIL',
      this.prismaBootstrap,
    );

    await this.prismaBootstrap.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    });
  }
}
