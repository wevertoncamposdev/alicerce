import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/client';
import { UsersService } from './user.service';
import { UserMapper } from './mappers/user.mapper';
import { UserBusinessRules } from './domain/rules/user-business-rules';
import { UserErrorMapper } from './mappers/user-error.mapper';
import { UserRepository } from './persistence/repository/user.repository';
import { PrismaService } from '@core/prisma/prisma.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';
import { RolesService } from '../role/roles.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<UserRepository>;
  let userMapper: jest.Mocked<UserMapper>;

  const repositoryMock = {
    create: jest.fn(),
    findManyActive: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    updateById: jest.fn(),
    softDeleteById: jest.fn(),
    countActive: jest.fn(),
    findManyWithBirthDate: jest.fn(),
  };

  const userMapperMock = {
    mapToResponseDto: jest.fn(),
    mapToResponseDtoArray: jest.fn(),
  };

  const prismaMock = {
    userRole: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    rolePermission: { findMany: jest.fn() },
    refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };

  const rolesServiceMock = {
    hasOtherActiveAdmin: jest.fn().mockResolvedValue(true),
  };

  const permissionCacheMock = {
    invalidateUser: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.userRole.count.mockResolvedValue(0);
    rolesServiceMock.hasOtherActiveAdmin.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        UserBusinessRules,
        UserErrorMapper,
        {
          provide: UserRepository,
          useValue: repositoryMock,
        },
        {
          provide: UserMapper,
          useValue: userMapperMock,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: RolesService,
          useValue: rolesServiceMock,
        },
        {
          provide: PermissionCacheService,
          useValue: permissionCacheMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(UserRepository);
    userMapper = module.get(UserMapper);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash password, persist user and map response', async () => {
    const repositoryResult = {
      id: 'user-id',
      email: 'john@example.com',
      tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const mappedResult = {
      id: 'user-id',
      email: 'john@example.com',
      isAdult: false,
    };

    repository.create.mockResolvedValueOnce(repositoryResult as never);
    userMapper.mapToResponseDto.mockReturnValueOnce(mappedResult as never);

    const result = await service.create(
      {
        email: 'john@example.com',
        tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
        password: '123456',
      },
      'adf4f488-faa3-4fca-946e-522f7c2d4976',
    );

    expect(result).toEqual(mappedResult);
    expect(repository.create).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: 'hashed-password',
      tenant: { connect: { id: 'adf4f488-faa3-4fca-946e-522f7c2d4976' } },
      person: undefined,
    });
  });

  it('should ignore tenantId from the body and use only the authenticated tenant context on create', async () => {
    const repositoryResult = {
      id: 'user-id',
      email: 'john@example.com',
      tenantId: 'tenant-ctx',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    repository.create.mockResolvedValueOnce(repositoryResult as never);
    userMapper.mapToResponseDto.mockReturnValueOnce({
      id: 'user-id',
      email: 'john@example.com',
      isAdult: false,
    } as never);

    await service.create(
      {
        email: 'john@example.com',
        tenantId: 'malicious-tenant',
        password: '123456',
      },
      'tenant-ctx',
    );

    expect(repository.create).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: 'hashed-password',
      tenant: { connect: { id: 'tenant-ctx' } },
      person: undefined,
    });
  });

  it('should map prisma P2002 to conflict exception on create', async () => {
    const prismaError = Object.create(
      Prisma.PrismaClientKnownRequestError.prototype,
    ) as Prisma.PrismaClientKnownRequestError;

    Object.assign(prismaError, {
      code: 'P2002',
      meta: { target: ['email'] },
    });

    repository.create.mockRejectedValueOnce(prismaError);

    await expect(
      service.create(
        {
          email: 'john@example.com',
          tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
          password: '123456',
        },
        'adf4f488-faa3-4fca-946e-522f7c2d4976',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('tenant isolation', () => {
    const ownTenantId = 'tenant-own';
    const otherTenantId = 'tenant-other';
    const userId = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
    const userFromOtherTenant = {
      id: userId,
      email: 'victim@example.com',
      tenantId: otherTenantId,
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('findOne: should throw NotFoundException when the user belongs to another tenant', async () => {
      repository.findById.mockResolvedValueOnce(userFromOtherTenant as never);

      await expect(service.findOne(userId, ownTenantId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('update: should throw NotFoundException and never touch the row when the user belongs to another tenant', async () => {
      repository.findById.mockResolvedValueOnce(userFromOtherTenant as never);

      await expect(
        service.update(userId, { email: 'new@example.com' }, ownTenantId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('remove: should throw NotFoundException and never touch the row when the user belongs to another tenant', async () => {
      repository.findById.mockResolvedValueOnce(userFromOtherTenant as never);

      await expect(service.remove(userId, ownTenantId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.softDeleteById).not.toHaveBeenCalled();
    });

    it('findAllWithValidation: should scope the repository query to the given tenant', async () => {
      repository.findManyActive.mockResolvedValueOnce([] as never);
      userMapper.mapToResponseDtoArray.mockReturnValueOnce([] as never);

      await service.findAllWithValidation(ownTenantId);

      expect(repository.findManyActive).toHaveBeenCalledWith(ownTenantId);
    });
  });

  // C4: desativar ou remover o último admin do tenant é bloqueado (ver
  // FECHAMENTO.md e RolesService.hasOtherActiveAdmin, reaproveitado aqui).
  describe('admin lockout protection (C4)', () => {
    const ownTenantId = 'tenant-own';
    const userId = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
    const ownUser = {
      id: userId,
      email: 'admin@example.com',
      tenantId: ownTenantId,
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('update: blocks deactivating the last admin of the tenant', async () => {
      repository.findById.mockResolvedValueOnce(ownUser as never);
      prismaMock.userRole.count.mockResolvedValueOnce(1); // é admin
      rolesServiceMock.hasOtherActiveAdmin.mockResolvedValueOnce(false);

      await expect(
        service.update(userId, { status: 'INACTIVE' }, ownTenantId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('update: allows deactivating an admin when another active admin remains', async () => {
      repository.findById.mockResolvedValueOnce(ownUser as never);
      prismaMock.userRole.count.mockResolvedValueOnce(1);
      rolesServiceMock.hasOtherActiveAdmin.mockResolvedValueOnce(true);
      repository.updateById.mockResolvedValueOnce({
        ...ownUser,
        status: 'INACTIVE',
      } as never);

      await service.update(userId, { status: 'INACTIVE' }, ownTenantId);

      expect(repository.updateById).toHaveBeenCalled();
    });

    it('update: never checks admin lockout for a non-admin user', async () => {
      repository.findById.mockResolvedValueOnce(ownUser as never);
      prismaMock.userRole.count.mockResolvedValueOnce(0); // não é admin
      repository.updateById.mockResolvedValueOnce({
        ...ownUser,
        status: 'INACTIVE',
      } as never);

      await service.update(userId, { status: 'INACTIVE' }, ownTenantId);

      expect(rolesServiceMock.hasOtherActiveAdmin).not.toHaveBeenCalled();
      expect(repository.updateById).toHaveBeenCalled();
    });

    it('remove: blocks removing the last admin of the tenant', async () => {
      repository.findById.mockResolvedValueOnce(ownUser as never);
      prismaMock.userRole.count.mockResolvedValueOnce(1);
      rolesServiceMock.hasOtherActiveAdmin.mockResolvedValueOnce(false);

      await expect(service.remove(userId, ownTenantId)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.softDeleteById).not.toHaveBeenCalled();
    });
  });

  describe('session revocation on status/password change', () => {
    const ownTenantId = 'tenant-own';
    const userId = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
    const ownUser = {
      id: userId,
      email: 'user@example.com',
      tenantId: ownTenantId,
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('update: revokes sessions and invalidates the permission cache when deactivating', async () => {
      repository.findById.mockResolvedValueOnce(ownUser as never);
      repository.updateById.mockResolvedValueOnce({
        ...ownUser,
        status: 'INACTIVE',
      } as never);

      await service.update(userId, { status: 'INACTIVE' }, ownTenantId);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId },
        // `expect.any(Date)` é tipado como `any` pelo @types/jest — ver
        // roles.service.spec.ts para o mesmo padrão.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { revokedAt: expect.any(Date) },
      });
      expect(permissionCacheMock.invalidateUser).toHaveBeenCalledWith(
        ownTenantId,
        userId,
      );
    });

    it('update: revokes sessions when the password changes, even without a status change', async () => {
      repository.findById.mockResolvedValueOnce(ownUser as never);
      repository.updateById.mockResolvedValueOnce(ownUser as never);

      await service.update(userId, { password: 'new-password' }, ownTenantId);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalled();
      expect(permissionCacheMock.invalidateUser).toHaveBeenCalled();
    });

    it('update: does not revoke sessions for an unrelated field change', async () => {
      repository.findById.mockResolvedValueOnce(ownUser as never);
      repository.updateById.mockResolvedValueOnce(ownUser as never);

      await service.update(userId, { email: 'new@example.com' }, ownTenantId);

      expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(permissionCacheMock.invalidateUser).not.toHaveBeenCalled();
    });

    it('remove: always revokes sessions and invalidates the permission cache', async () => {
      repository.findById.mockResolvedValueOnce(ownUser as never);
      repository.softDeleteById.mockResolvedValueOnce({
        ...ownUser,
        deletedAt: new Date(),
      } as never);

      await service.remove(userId, ownTenantId);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId },
        // `expect.any(Date)` é tipado como `any` pelo @types/jest — ver
        // roles.service.spec.ts para o mesmo padrão.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { revokedAt: expect.any(Date) },
      });
      expect(permissionCacheMock.invalidateUser).toHaveBeenCalledWith(
        ownTenantId,
        userId,
      );
    });
  });
});
