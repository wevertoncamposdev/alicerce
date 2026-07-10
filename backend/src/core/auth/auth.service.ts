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
import { PrismaService } from '@core/prisma/prisma.service';
import { SignUpPublicDto } from './dto/sign-up-public.dto';
import {
  PermissionType,
  RoleType,
  TenantCategory,
  TenantServiceArea,
} from '@core/prisma/generated/enums';
import { I18nService } from 'nestjs-i18n';

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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) { }

  private mapPermissionType(permissionName: string): PermissionType {
    if (permissionName.endsWith('.read')) {
      return 'READ';
    }

    if (permissionName.endsWith('.delete')) {
      return 'DELETE';
    }

    return 'WRITE';
  }

  private buildRegistrationNumber(tenantSlug: string) {
    const normalized = tenantSlug
      .replace(/[^a-z0-9]/gi, '')
      .slice(0, 8)
      .toUpperCase();

    return `${normalized || 'TENANT'}${Date.now().toString().slice(-10)}`.slice(
      0,
      20,
    );
  }

  private async getAuthUserByEmail(email: string) {
    return this.prisma.user.findUnique({
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
    return this.prisma.user.findUnique({
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

  private mapAuthUserContext(user: NonNullable<Awaited<ReturnType<AuthService['getAuthUserById']>>>) {
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

    await this.prisma.refreshToken.create({
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

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    // Token inexistente ou expirado
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // ⚠️  Reuso detectado: token já foi revogado mas alguém está tentando usá-lo.
    // Isso indica que o token pode ter sido roubado. A decisão mais segura
    // é revogar toda a família — forçando novo login para todos.
    if (storedToken.revokedAt !== null) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException(
        'Sessão inválida. Faça login novamente.',
      );
    }

    // Revoga o token atual antes de emitir o próximo
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.getAuthUserById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const mappedUser = this.mapAuthUserContext(user);
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

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    if (!storedToken) return; // Token inválido — logout silencioso

    await this.prisma.refreshToken.updateMany({
      where: { familyId: storedToken.familyId },
      data: { revokedAt: new Date() },
    });
  }

  async signUpPublic(dto: SignUpPublicDto): Promise<AuthSessionResponse> {
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingByEmail) {
      throw new ConflictException('Ja existe usuario com este email');
    }

    const existingBySlug = await this.prisma.tenant.findFirst({
      where: { slug: dto.tenantSlug },
    });

    if (existingBySlug) {
      throw new ConflictException('Ja existe tenant com este slug');
    }

    const basePermissions = [
      'user.create',
      'user.read',
      'user.update',
      'user.delete',
      'role.create',
      'role.read',
      'role.update',
      'role.delete',
      'role.assign',
      'permission.create',
      'permission.read',
      'permission.update',
      'permission.delete',
      'audit.read',
      'tenant.read',
      'tenant.update',
      'task.create',
      'task.read',
      'task.update',
      'task.delete',
    ];

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          legalName: dto.tenantName,
          tradeName: dto.tenantName,
          registrationNumber: this.buildRegistrationNumber(dto.tenantSlug),
          slug: dto.tenantSlug,
          category: TenantCategory.OTHER,
          primaryServiceArea: TenantServiceArea.OTHER,
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
        data: basePermissions.map((name) => ({
          tenantId: tenant.id,
          name,
          type: this.mapPermissionType(name),
        })),
        skipDuplicates: true,
      });

      const permissions = await tx.permission.findMany({
        where: { tenantId: tenant.id, name: { in: basePermissions } },
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

    const mappedUser = this.mapAuthUserContext(user);
    const familyId = crypto.randomUUID();
    const [access_token, refresh_token] = await Promise.all([
      this.signToken(mappedUser),
      this.createRefreshToken({ userId: user.id, tenantId: user.tenantId, familyId }),
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
      const message = await this.i18n.translate('messages.USER.NOT_FOUND', {
        lang: 'pt-BR',
      });
      throw new UnauthorizedException(message);
    }

    const isPasswordValid = await bcrypt.compare(signInDto.password, user.password);

    if (!isPasswordValid) {
      const message = await this.i18n.translate('messages.USER.INVALID_CREDENTIALS', {
        lang: 'pt-BR',
      });
      throw new UnauthorizedException(message);
    }

    const mappedUser = this.mapAuthUserContext(user);
    const familyId = crypto.randomUUID();
    const [access_token, refresh_token] = await Promise.all([
      this.signToken(mappedUser),
      this.createRefreshToken({ userId: user.id, tenantId: user.tenantId, familyId }),
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
