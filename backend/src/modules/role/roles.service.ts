import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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

  // Etapa 3.5 (ADR 0007): recursos × ações do catálogo materializado no
  // tenant, com o que já está marcado para este papel. Usa `Permission` do
  // tenant (não `PERMISSION_CATALOG` direto) porque é lá que vive o `id`
  // que o `PUT` abaixo precisa receber de volta.
  async getPermissionMatrix(roleId: string, tenantId: string) {
    findOneOrThrow(
      await this.prisma.role.findUnique({ where: { id: roleId } }),
      (role) => !role.deletedAt && role.tenantId === tenantId,
      'Role nao encontrada',
    );

    const [catalogPermissions, granted] = await Promise.all([
      this.prisma.permission.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: [{ resource: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.rolePermission.findMany({
        where: { roleId, tenantId, resource: null },
        select: { permissionId: true },
      }),
    ]);

    const grantedIds = new Set(granted.map((item) => item.permissionId));

    const byResource = new Map<
      string,
      Array<{
        id: string;
        name: string;
        type: string;
        description: string | null;
        granted: boolean;
      }>
    >();

    for (const permission of catalogPermissions) {
      const resource = permission.resource ?? 'outros';
      if (!byResource.has(resource)) {
        byResource.set(resource, []);
      }
      byResource.get(resource)!.push({
        id: permission.id,
        name: permission.name,
        type: permission.type,
        description: permission.description,
        granted: grantedIds.has(permission.id),
      });
    }

    return [...byResource.entries()].map(([resource, permissions]) => ({
      resource,
      permissions,
    }));
  }

  // Substitui o conjunto de permissões do papel em uma única transação
  // (diff contra o atual, não detach+attach um por um) — único caminho de
  // concessão de permissão hoje (F2.1: os endpoints de attach/detach
  // isolado foram removidos, sem consumidor e com um bug de upsert no
  // Prisma 7.10 quando `resource` é nulo).
  async replacePermissions(
    roleId: string,
    tenantId: string,
    permissionIds: string[],
  ) {
    findOneOrThrow(
      await this.prisma.role.findUnique({ where: { id: roleId } }),
      (role) => !role.deletedAt && role.tenantId === tenantId,
      'Role nao encontrada',
    );

    const uniqueIds = [...new Set(permissionIds)];

    if (uniqueIds.length > 0) {
      const existingPermissions = await this.prisma.permission.findMany({
        where: { tenantId, deletedAt: null, id: { in: uniqueIds } },
        select: { id: true },
      });
      if (existingPermissions.length !== uniqueIds.length) {
        throw new NotFoundException(
          'Uma ou mais permissões não existem neste tenant.',
        );
      }
    }

    const current = await this.prisma.rolePermission.findMany({
      where: { roleId, tenantId, resource: null },
      select: { permissionId: true },
    });
    const currentIds = new Set(current.map((item) => item.permissionId));
    const nextIds = new Set(uniqueIds);

    const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
    const toAdd = [...nextIds].filter((id) => !currentIds.has(id));

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: {
          tenantId,
          roleId,
          resource: null,
          permissionId: { in: toRemove },
        },
      }),
      this.prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({
          tenantId,
          roleId,
          permissionId,
          resource: null,
        })),
        skipDuplicates: true,
      }),
    ]);

    await this.invalidatePermissionCacheForRole(roleId, tenantId);

    return this.getPermissionMatrix(roleId, tenantId);
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
