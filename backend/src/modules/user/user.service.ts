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

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userMapper: UserMapper,
    private readonly userBusinessRules: UserBusinessRules,
    private readonly userErrorMapper: UserErrorMapper,
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
  ) {}

  // Rule C4: desativar/remover o último admin do tenant é bloqueado, mesmo
  // que quem esteja fazendo a ação seja outro admin ou o próprio usuário. Só
  // importa se ESTE usuário for admin — se não for, não há o que checar.
  private async assertNotLastActiveAdmin(userId: string, tenantId: string) {
    const isCurrentlyAdmin = await this.prisma.userRole.count({
      where: {
        tenantId,
        userId,
        role: { type: 'ADMIN', deletedAt: null },
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

  async create(
    createUserDto: CreateUserDto,
    tenantId: string,
  ): Promise<UserResponseDto> {
    try {
      // tenantId do body nunca é usado — vem do contexto autenticado
      // (parâmetro `tenantId` desta função), nunca do payload do cliente.
      const { tenantId: _tenantId, ...rest } = createUserDto;
      void _tenantId;
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = await this.userRepository.create({
        ...rest,
        password: hashedPassword,
        tenant: {
          connect: { id: tenantId },
        },
      });

      return this.userMapper.mapToResponseDto(user);
    } catch (error) {
      this.userErrorMapper.mapAndThrow(error, 'create');
    }
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

      return await this.userRepository.updateById(id, data);
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

      return await this.userRepository.softDeleteById(id);
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

      return user;
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

  async getAdultUserStats(
    search: string,
    tenantId: string,
  ): Promise<UserResponseDto[]> {
    const users = await this.findAllWithValidation(tenantId);
    return this.userBusinessRules.filterUsersBySearch(users, search);
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

    return { items: items, total, page, limit };
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
