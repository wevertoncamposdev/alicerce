import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SignInDto } from './dto/sign-in.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@core/prisma/prisma.service';
import { SignUpPublicDto } from './dto/sign-up-public.dto';
import {
  PermissionType,
  RoleType,
  TenantCategory,
  TenantServiceArea,
} from '@core/prisma/generated/enums';

export interface AuthUserContext {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

export interface AuthSessionResponse {
  access_token: string;
  user: AuthUserContext;
  tenant: {
    id: string;
    legalName: string;
    slug: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private jwtService: JwtService,
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

    return {
      access_token: await this.signToken(mappedUser),
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
      throw new UnauthorizedException('Not found');
    }

    const isPasswordValid = await bcrypt.compare(signInDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const mappedUser = this.mapAuthUserContext(user);

    return {
      access_token: await this.signToken(mappedUser),
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
