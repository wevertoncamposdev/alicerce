import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@core/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SearchRoleDto } from './dto/search-role.dto';
import { Prisma } from '@core/prisma/generated/client';
import { RoleRepository } from './persistence/role.repository';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { findOneOrThrow } from '@core/common/utils/find-one-or-throw.util';
import {
  resolvePagination,
  buildSearchTextWhere,
  buildWhitelistedFilters,
  buildWhitelistedOrderBy,
} from '@core/common/utils/tenant-search.util';

// Ver PLAN.md, Etapa 7.C ("whitelist por módulo").
const SEARCHABLE_FIELDS = ['name'] as const;
const FILTERABLE_FIELDS = ['name', 'type', 'description'] as const;
const SORTABLE_FIELDS = ['name', 'type', 'createdAt'] as const;

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleRepository: RoleRepository,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async findOne(id: string, tenantId: string) {
    return findOneOrThrow(
      await this.prisma.role.findUnique({ where: { id } }),
      (role) => !role.deletedAt && role.tenantId === tenantId,
      'Role nao encontrada',
    );
  }

  async findAll(tenantId: string) {
    return this.prisma.role.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        users: true,
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async create(dto: CreateRoleDto, tenantId?: string) {
    if (!tenantId) {
      throw new Error('TenantId is required to create a role');
    }

    return this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        description: dto.description,
        status: 'ACTIVE',
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.role.findUnique({ where: { id } }),
      (role) => !role.deletedAt && role.tenantId === tenantId,
      'Role nao encontrada',
    );

    // Papel de sistema (ADR 0007, etapa 3.4): não pode ser renomeado.
    // Outros campos (description, type — este último já não decide mais
    // acesso) continuam editáveis.
    if (existing.isSystem && dto.name && dto.name !== existing.name) {
      throw new ConflictException(
        'Não é possível renomear um papel de sistema.',
      );
    }

    return this.prisma.role.update({
      where: { id: existing.id },
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
      },
    });
  }

  // Admin de um tenant não pode virar zero: ver RolesService.hasOtherActiveAdmin.
  // Usada aqui (apagar a role ADMIN) e em detachUser (tirar a role de um
  // usuário) — as duas formas de "o tenant ficar sem admin". UsersService
  // usa o mesmo método para bloquear desativar/remover o último admin.
  async hasOtherActiveAdmin(
    tenantId: string,
    opts: { excludeUserId?: string; excludeRoleId?: string } = {},
  ): Promise<boolean> {
    const count = await this.prisma.userRole.count({
      where: {
        tenantId,
        userId: opts.excludeUserId ? { not: opts.excludeUserId } : undefined,
        roleId: opts.excludeRoleId ? { not: opts.excludeRoleId } : undefined,
        role: { isSystem: true, deletedAt: null },
        user: { deletedAt: null, status: 'ACTIVE' },
      },
    });

    return count > 0;
  }

  async remove(id: string, tenantId: string) {
    const existing = findOneOrThrow(
      await this.prisma.role.findUnique({ where: { id } }),
      (role) => !role.deletedAt && role.tenantId === tenantId,
      'Role nao encontrada',
    );

    // Papel de sistema nunca pode ser excluído (ADR 0007, etapa 3.4) — não
    // é mais condicional a "é o último admin": é sempre bloqueado.
    if (existing.isSystem) {
      throw new ConflictException(
        'Não é possível remover um papel de sistema.',
      );
    }

    const result = await this.prisma.role.update({
      where: { id: existing.id },
      data: {
        status: 'INACTIVE',
        deletedAt: new Date(),
      },
    });

    await this.invalidatePermissionCacheForRole(id, tenantId);

    return result;
  }

  // Mudar as permissões associadas a uma role afeta de uma vez todo mundo que
  // tem essa role — diferente de attachUser/detachUser, que afetam só 1
  // usuário.
  private async invalidatePermissionCacheForRole(
    roleId: string,
    tenantId: string,
  ): Promise<void> {
    const affectedUsers = await this.findUsersOfRole(roleId, tenantId);
    await this.permissionCache.invalidateUsers(
      tenantId,
      affectedUsers.map((userRole) => userRole.userId),
    );
  }

  async attachUser(roleId: string, tenantId: string, userId: string) {
    findOneOrThrow(
      await this.prisma.role.findUnique({ where: { id: roleId } }),
      (role) => !role.deletedAt && role.tenantId === tenantId,
      'Role nao encontrada',
    );

    findOneOrThrow(
      await this.prisma.user.findUnique({ where: { id: userId } }),
      (user) => !user.deletedAt,
      'User nao encontrado',
    );

    const userRole = await this.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      create: {
        tenantId,
        userId,
        roleId,
      },
      update: {
        assignedAt: new Date(),
      },
    });

    await this.permissionCache.invalidateUser(tenantId, userId);

    return userRole;
  }

  async detachUser(
    roleId: string,
    tenantId: string,
    userId: string,
    currentUserId?: string,
  ) {
    const role = findOneOrThrow(
      await this.prisma.role.findUnique({ where: { id: roleId } }),
      (r) => !r.deletedAt && r.tenantId === tenantId,
      'Role nao encontrada',
    );

    if (role.isSystem) {
      if (currentUserId && currentUserId === userId) {
        throw new ForbiddenException(
          'Você não pode remover sua própria permissão de administrador.',
        );
      }

      const hasOther = await this.hasOtherActiveAdmin(tenantId, {
        excludeUserId: userId,
      });
      if (!hasOther) {
        throw new ForbiddenException(
          'Não é possível remover o último administrador do tenant.',
        );
      }
    }

    const result = await this.prisma.userRole.deleteMany({
      where: {
        tenantId,
        roleId,
        userId,
      },
    });

    await this.permissionCache.invalidateUser(tenantId, userId);

    return { removed: result.count > 0 };
  }

  async attachPermission(
    roleId: string,
    tenantId: string,
    permissionId: string,
    resource?: string,
  ) {
    findOneOrThrow(
      await this.prisma.role.findUnique({ where: { id: roleId } }),
      (role) => !role.deletedAt && role.tenantId === tenantId,
      'Role nao encontrada',
    );

    findOneOrThrow(
      await this.prisma.permission.findUnique({ where: { id: permissionId } }),
      (permission) => !permission.deletedAt && permission.tenantId === tenantId,
      'Permission nao encontrada',
    );

    // upsert (idempotent) by unique composite [roleId, permissionId, resource].
    // O tipo gerado pelo Prisma para a chave composta exige `resource:
    // string` mesmo a coluna sendo nullable (limitação conhecida da geração
    // de tipos para chaves compostas com campo opcional) — o `null` em
    // runtime funciona normalmente, só o tipo do gerador é mais estrito.
    const uniqueWhere: Prisma.RolePermissionWhereUniqueInput = {
      roleId_permissionId_resource: {
        roleId,
        permissionId,
        resource: (resource ?? null) as unknown as string,
      },
    };

    const rolePermission = await this.prisma.rolePermission.upsert({
      where: uniqueWhere,
      create: {
        tenantId,
        roleId,
        permissionId,
        resource: resource ?? null,
      },
      update: {
        // touch to update timestamp if any (no timestamp field here), keep as no-op
      },
    });

    await this.invalidatePermissionCacheForRole(roleId, tenantId);

    return rolePermission;
  }

  async detachPermission(
    roleId: string,
    tenantId: string,
    permissionId: string,
  ) {
    const result = await this.prisma.rolePermission.deleteMany({
      where: {
        tenantId,
        roleId,
        permissionId,
      },
    });

    await this.invalidatePermissionCacheForRole(roleId, tenantId);

    return { removed: result.count > 0 };
  }

  async search(query: SearchRoleDto, tenantId?: string) {
    const { page, limit, skip, take } = resolvePagination(query.pagination);

    const where: Prisma.RoleWhereInput = {
      tenantId: tenantId ?? undefined,
      deletedAt: null,
      ...buildSearchTextWhere(query.searchText, SEARCHABLE_FIELDS),
      ...buildWhitelistedFilters(query.filters, FILTERABLE_FIELDS),
    };
    const orderBy = buildWhitelistedOrderBy(query.sort, SORTABLE_FIELDS);

    const [items, total] = await Promise.all([
      this.roleRepository.search(
        where,
        skip,
        take,
        orderBy.length ? orderBy : undefined,
      ),
      this.roleRepository.count(where),
    ]);

    return { items, total, page, limit };
  }

  async findPermissionsOfRole(roleId: string, tenantId: string) {
    return this.prisma.rolePermission.findMany({
      where: { roleId, tenantId },
      include: {
        permission: {
          select: {
            id: true,
            name: true,
            type: true,
            resource: true,
            description: true,
            tenantId: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async findUsersOfRole(roleId: string, tenantId: string) {
    return this.prisma.userRole.findMany({
      where: { roleId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            tenantId: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async findRolesOfUser(userId: string, tenantId: string) {
    return this.prisma.userRole.findMany({
      where: { userId, tenantId },
      include: {
        role: {
          select: { id: true, name: true, type: true, description: true },
        },
      },
    });
  }
}
