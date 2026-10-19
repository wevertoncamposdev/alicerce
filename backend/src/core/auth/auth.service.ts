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
import { AuditService } from '@modules/audit/audit.service';
import { SignUpPublicDto } from './dto/sign-up-public.dto';
import { RoleType } from '@core/prisma/generated/enums';
import { I18nService } from 'nestjs-i18n';
import {
  PERMISSION_CATALOG,
  TENANT_ADMIN_PERMISSION_NAMES,
} from '@core/authorization/permission-catalog';

export interface AuthUserContext {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
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
  ) {}

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
    const roleNames = Array.from(
      new Set(user.roles.map((item) => item.role.type)),
    );
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
      tenantId: user.tenantId,
      roles: roleNames,
      permissions: permissionNames,
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
      roles: user.roles,
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
  }: {
    userId: string;
    tenantId: string;
    familyId: string;
  }): Promise<string> {
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
  async refreshTokens(rawToken: string): Promise<AuthSessionResponse> {
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

  async signUpPublic(dto: SignUpPublicDto): Promise<AuthSessionResponse> {
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

    const mappedUser = await this.mapAuthUserContext(user);
    const familyId = crypto.randomUUID();
    const [access_token, refresh_token] = await Promise.all([
      this.signToken(mappedUser),
      this.createRefreshToken({
        userId: user.id,
        tenantId: user.tenantId,
        familyId,
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

  async signIn(signInDto: SignInDto): Promise<AuthSessionResponse> {
    const user = await this.getAuthUserByEmail(signInDto.email);

    if (!user) {
      const message = this.i18n.translate('messages.USER.NOT_FOUND', {
        lang: 'pt-BR',
      });
      throw new UnauthorizedException(message);
    }

    const isPasswordValid = await bcrypt.compare(
      signInDto.password,
      user.password,
    );

    if (!isPasswordValid) {
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
}
