//@Lib
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

//@Core
import { Prisma, Permission } from '@core/prisma/generated/client';
import { PrismaService } from '@core/prisma/prisma.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { revokeSessions } from '@core/auth/session-revocation.util';
import { AccountTokenService } from '@core/auth/account-token.service';
import { MailService } from '@core/mail/mail.service';
import { FilesService } from '@core/files/file.service';
import { resolveTenantBranding } from '@core/mail/resolve-tenant-branding.util';
import { renderAccountEmail } from '@core/mail/templates/account-email.template';

//@DTO
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { SearchUsersDto } from './dto/search-users.dto';

//@Mappers
import { UserMapper } from './mappers/user.mapper';
import { UserErrorMapper } from './mappers/user-error.mapper';

//@Domain
import { UserBusinessRules } from './domain/rules/user-business-rules';
import { UserErrorCode } from './domain/errors/user-error-codes';

//@Repository
import { UserRepository } from './persistence/repository/user.repository';

import { RolesService } from '../role/roles.service';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Qualquer linha de `users` que passe pelo controller — nunca devolve o
// hash da senha, só o booleano computado (ver ADR 0011 / Plano Base.md
// 7.4). `search`/`findOne`/`update`/`remove` continuam devolvendo o
// restante da linha tal como já faziam (status, tenantId etc. — o
// frontend depende dessa forma), só sem `password` cru.
function withPendingInvite<T extends { password: string | null }>(
  user: T,
): Omit<T, 'password'> & { pendingInvite: boolean } {
  const { password, ...rest } = user;
  return { ...rest, pendingInvite: password === null };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userMapper: UserMapper,
    private readonly userBusinessRules: UserBusinessRules,
    private readonly userErrorMapper: UserErrorMapper,
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
    private readonly permissionCache: PermissionCacheService,
    private readonly accountTokenService: AccountTokenService,
    private readonly mailService: MailService,
    private readonly filesService: FilesService,
  ) {}

  // Fecha toda sessão aberta do usuário (ex.: desativação, exclusão, troca
  // de senha) — RefreshToken já é tenant-scoped via RLS (TENANT_SCOPED_MODELS),
  // então este updateMany nunca alcança refresh tokens de outro tenant.
  private async revokeAllSessions(userId: string, tenantId: string) {
    await revokeSessions(this.prisma, userId, { all: true });
    await this.permissionCache.invalidateUser(tenantId, userId);
  }

  // Rule C4: desativar/remover o último admin do tenant é bloqueado, mesmo
  // que quem esteja fazendo a ação seja outro admin ou o próprio usuário. Só
  // importa se ESTE usuário for admin — se não for, não há o que checar.
  private async assertNotLastActiveAdmin(userId: string, tenantId: string) {
    const isCurrentlyAdmin = await this.prisma.userRole.count({
      where: {
        tenantId,
        userId,
        role: { isSystem: true, deletedAt: null },
      },
    });

    if (isCurrentlyAdmin === 0) {
      return;
    }

    const hasOther = await this.rolesService.hasOtherActiveAdmin(tenantId, {
      excludeUserId: userId,
    });

    if (!hasOther) {
      throw new ForbiddenException(
        'Não é possível desativar ou remover o último administrador do tenant.',
      );
    }
  }

  // "Criar" um usuário agora é só convidar (etapa 7.4, Plano Base.md):
  // sem senha, `invitedAt` marcado, e-mail de convite com um AccountToken
  // de uso único. Mesma permissão de antes (`user.create`).
  async invite(
    createUserDto: CreateUserDto,
    tenantId: string,
  ): Promise<UserResponseDto> {
    try {
      // tenantId do body nunca é usado — vem do contexto autenticado
      // (parâmetro `tenantId` desta função), nunca do payload do cliente.
      const { tenantId: _tenantId, ...rest } = createUserDto;
      void _tenantId;
      const user = await this.userRepository.create({
        ...rest,
        password: null,
        invitedAt: new Date(),
        tenant: {
          connect: { id: tenantId },
        },
      });

      await this.sendInviteEmail(user.id, tenantId, user.email);

      return this.userMapper.mapToResponseDto(user);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'create');
    }
  }

  // Reenvio (etapa 7.4): invalida qualquer convite ainda não usado e emite
  // um novo — mesmo e-mail, novo token, novo prazo de 7 dias.
  async resendInvite(id: string, tenantId: string): Promise<void> {
    this.userBusinessRules.validateUserId(id);

    const existing = await this.userRepository.findById(id);
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException({
        message: 'Usuario nao encontrado',
        code: UserErrorCode.NOT_FOUND,
        details: { id },
      });
    }

    if (existing.password !== null) {
      throw new ForbiddenException(
        'Este usuário já aceitou o convite e definiu uma senha.',
      );
    }

    await this.accountTokenService.invalidatePending(id, 'INVITE');
    await this.sendInviteEmail(id, tenantId, existing.email);
  }

  private async sendInviteEmail(
    userId: string,
    tenantId: string,
    email: string,
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, legalName: true, tradeName: true, logoFileId: true },
    });
    if (!tenant) {
      return;
    }

    const rawToken = await this.accountTokenService.issue({
      userId,
      tenantId,
      type: 'INVITE',
      ttlMs: INVITE_TTL_MS,
    });

    const { tenantName, tenantLogoUrl } = await resolveTenantBranding(
      this.filesService,
      tenant,
    );
    const { html, text } = renderAccountEmail({
      title: 'Você foi convidado',
      bodyText: `Você foi convidado a fazer parte de ${tenantName}. Clique no botão abaixo para definir sua senha e acessar sua conta.`,
      tenantName,
      tenantLogoUrl,
      actionUrl: `${process.env.FRONTEND_URL}/auth/accept-invite?token=${rawToken}`,
      actionLabel: 'Aceitar convite',
    });

    await this.mailService.send({
      to: email,
      subject: 'Você foi convidado',
      html,
      text,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, tenantId: string) {
    this.userBusinessRules.validateUserId(id);

    try {
      const existing = await this.userRepository.findById(id);
      if (!existing || existing.tenantId !== tenantId) {
        throw new NotFoundException({
          message: 'Usuario nao encontrado',
          code: UserErrorCode.NOT_FOUND,
          details: { id },
        });
      }

      if (updateUserDto.status && updateUserDto.status !== 'ACTIVE') {
        await this.assertNotLastActiveAdmin(id, tenantId);
      }

      const { password, ...rest } = updateUserDto;
      const data: Prisma.UserUpdateInput = { ...rest };

      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }

      const updated = await this.userRepository.updateById(id, data);

      // Desativar o usuário ou trocar a senha invalida qualquer sessão já
      // aberta — senão um token emitido antes continuaria valendo.
      if (
        (updateUserDto.status && updateUserDto.status !== 'ACTIVE') ||
        password
      ) {
        await this.revokeAllSessions(id, tenantId);
      }

      return withPendingInvite(updated);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'update');
    }
  }

  async remove(id: string, tenantId: string) {
    this.userBusinessRules.validateUserId(id);

    try {
      const existing = await this.userRepository.findById(id);
      if (!existing || existing.tenantId !== tenantId) {
        throw new NotFoundException({
          message: 'Usuario nao encontrado',
          code: UserErrorCode.NOT_FOUND,
          details: { id },
        });
      }

      await this.assertNotLastActiveAdmin(id, tenantId);

      const removed = await this.userRepository.anonymizeById(id);
      await this.revokeAllSessions(id, tenantId);

      return withPendingInvite(removed);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'remove');
    }
  }

  async findAll(tenantId: string) {
    try {
      const users = await this.userRepository.findManyActive(tenantId);
      return users;
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findAll');
    }
  }

  async findOne(id: string, tenantId: string) {
    this.userBusinessRules.validateUserId(id);

    try {
      const user = await this.userRepository.findById(id);

      if (!user || user.tenantId !== tenantId) {
        throw new NotFoundException({
          message: 'Usuario nao encontrado',
          code: UserErrorCode.NOT_FOUND,
          details: { id },
        });
      }

      // Resolvido só aqui (detail, um registro) — mesmo padrão de
      // MeService/TenantService. A lista não precisa (não mostra avatar).
      const avatarUrl = user.avatarFileId
        ? await this.filesService.getSignedUrlOrNull(
            user.avatarFileId,
            tenantId,
          )
        : null;

      return { ...withPendingInvite(user), avatarUrl };
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findOne');
    }
  }

  async findOneWithEmail(email: string) {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findOne');
    }
  }

  async findAllWithValidation(tenantId: string): Promise<UserResponseDto[]> {
    try {
      const users = await this.userRepository.findManyActive(tenantId);
      return this.userMapper.mapToResponseDtoArray(users);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findAll');
    }
  }

  async getActiveUsersCount(): Promise<number> {
    try {
      return await this.userRepository.countActive();
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'findAll');
    }
  }

  async search(query: SearchUsersDto, tenantId: string) {
    const page =
      query.pagination?.pageIndex !== undefined
        ? query.pagination.pageIndex + 1
        : 1;
    const limit = query.pagination?.pageSize ?? 20;

    const where: Prisma.UserWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.searchText
        ? { email: { contains: query.searchText, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.userRepository.search(where, (page - 1) * limit, limit),
      this.userRepository.count(where),
    ]);

    return { items: items.map(withPendingInvite), total, page, limit };
  }

  async findPermissionsOfUser(userId: string, tenantId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, tenantId },
      select: { roleId: true },
    });

    if (!userRoles.length) return [];

    const roleIds = userRoles.map((entry) => entry.roleId);
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { tenantId, roleId: { in: roleIds } },
      include: { permission: true },
    });

    const uniquePermissions = new Map<string, Permission>();
    for (const item of rolePermissions) {
      if (item.permission && !uniquePermissions.has(item.permission.id)) {
        uniquePermissions.set(item.permission.id, item.permission);
      }
    }

    return [...uniquePermissions.values()];
  }
}
