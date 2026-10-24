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
import { AccountTokenService } from '@core/auth/account-token.service';
import { MailService } from '@core/mail/mail.service';
import { FilesService } from '@core/files/file.service';
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
    anonymizeById: jest.fn(),
    countActive: jest.fn(),
    search: jest.fn(),
    count: jest.fn(),
  };

  const userMapperMock = {
    mapToResponseDto: jest.fn(),
    mapToResponseDtoArray: jest.fn(),
  };

  const prismaMock = {
    userRole: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    rolePermission: { findMany: jest.fn() },
    refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    tenant: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tenant-id',
        legalName: 'Instituicao Teste',
        tradeName: null,
        logoFileId: null,
      }),
    },
  };

  const rolesServiceMock = {
    hasOtherActiveAdmin: jest.fn().mockResolvedValue(true),
  };

  const permissionCacheMock = {
    invalidateUser: jest.fn().mockResolvedValue(undefined),
  };

  const accountTokenServiceMock = {
    issue: jest.fn().mockResolvedValue('raw-invite-token'),
    invalidatePending: jest.fn().mockResolvedValue(undefined),
  };

  const mailServiceMock = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const filesServiceMock = {
    getSignedUrlOrNull: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.userRole.count.mockResolvedValue(0);
    prismaMock.tenant.findUnique.mockResolvedValue({
      id: 'tenant-id',
      legalName: 'Instituicao Teste',
      tradeName: null,
      logoFileId: null,
    });
    rolesServiceMock.hasOtherActiveAdmin.mockResolvedValue(true);
    accountTokenServiceMock.issue.mockResolvedValue('raw-invite-token');

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
        {
          provide: AccountTokenService,
          useValue: accountTokenServiceMock,
        },
        {
          provide: MailService,
          useValue: mailServiceMock,
        },
        {
          provide: FilesService,
          useValue: filesServiceMock,
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

  it('should create the user without a password, send the invite e-mail and map response', async () => {
    const repositoryResult = {
      id: 'user-id',
      email: 'john@example.com',
      tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
      password: null,
      invitedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    const mappedResult = {
      id: 'user-id',
      email: 'john@example.com',
      isAdult: false,
      pendingInvite: true,
    };

    repository.create.mockResolvedValueOnce(repositoryResult as never);
    userMapper.mapToResponseDto.mockReturnValueOnce(mappedResult as never);

    const result = await service.invite(
      {
        email: 'john@example.com',
        tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
      },
      'adf4f488-faa3-4fca-946e-522f7c2d4976',
    );

    expect(result).toEqual(mappedResult);
    expect(repository.create).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: null,
      // `expect.any(Date)` é tipado como `any` pelo @types/jest — ver
      // roles.service.spec.ts para o mesmo padrão.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      invitedAt: expect.any(Date),
      tenant: { connect: { id: 'adf4f488-faa3-4fca-946e-522f7c2d4976' } },
      person: undefined,
    });
    expect(accountTokenServiceMock.issue).toHaveBeenCalledWith({
      userId: 'user-id',
      tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
      type: 'INVITE',
      ttlMs: 7 * 24 * 60 * 60 * 1000,
    });
    expect(mailServiceMock.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'john@example.com' }),
    );
  });

  it('should ignore tenantId from the body and use only the authenticated tenant context on invite', async () => {
    const repositoryResult = {
      id: 'user-id',
      email: 'john@example.com',
      tenantId: 'tenant-ctx',
      password: null,
      invitedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    repository.create.mockResolvedValueOnce(repositoryResult as never);
    userMapper.mapToResponseDto.mockReturnValueOnce({
      id: 'user-id',
      email: 'john@example.com',
      isAdult: false,
      pendingInvite: true,
    } as never);

    await service.invite(
      {
        email: 'john@example.com',
        tenantId: 'malicious-tenant',
      },
      'tenant-ctx',
    );

    expect(repository.create).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      invitedAt: expect.any(Date),
      tenant: { connect: { id: 'tenant-ctx' } },
      person: undefined,
    });
  });

  it('should map prisma P2002 to conflict exception on invite', async () => {
    const prismaError = Object.create(
      Prisma.PrismaClientKnownRequestError.prototype,
    ) as Prisma.PrismaClientKnownRequestError;

    Object.assign(prismaError, {
      code: 'P2002',
      meta: { target: ['email'] },
    });

    repository.create.mockRejectedValueOnce(prismaError);

    await expect(
      service.invite(
        {
          email: 'john@example.com',
          tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
        },
        'adf4f488-faa3-4fca-946e-522f7c2d4976',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('resendInvite', () => {
    const tenantId = 'tenant-own';
    const userId = 'adf4f488-faa3-4fca-946e-522f7c2d4976';

    it('invalidates pending invite tokens and sends a new invite e-mail', async () => {
      repository.findById.mockResolvedValueOnce({
        id: userId,
        email: 'invited@example.com',
        tenantId,
        password: null,
        createdAt: new Date(),
      } as never);

      await service.resendInvite(userId, tenantId);

      expect(accountTokenServiceMock.invalidatePending).toHaveBeenCalledWith(
        userId,
        'INVITE',
      );
      expect(mailServiceMock.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'invited@example.com' }),
      );
    });

    it('throws when the user already accepted the invite', async () => {
      repository.findById.mockResolvedValueOnce({
        id: userId,
        email: 'already@example.com',
        tenantId,
        password: 'hashed-password',
        createdAt: new Date(),
      } as never);

      await expect(
        service.resendInvite(userId, tenantId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mailServiceMock.send).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a user from another tenant', async () => {
      repository.findById.mockResolvedValueOnce({
        id: userId,
        email: 'victim@example.com',
        tenantId: 'tenant-other',
        password: null,
        createdAt: new Date(),
      } as never);

      await expect(
        service.resendInvite(userId, tenantId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('pendingInvite / password never leaks', () => {
    const tenantId = 'tenant-own';
    const userId = 'adf4f488-faa3-4fca-946e-522f7c2d4976';

    it('findOne computes pendingInvite and strips password', async () => {
      repository.findById.mockResolvedValueOnce({
        id: userId,
        email: 'invited@example.com',
        tenantId,
        password: null,
        status: 'ACTIVE',
        createdAt: new Date(),
      } as never);

      const result = await service.findOne(userId, tenantId);

      expect(result).toMatchObject({ pendingInvite: true, avatarUrl: null });
      expect(result).not.toHaveProperty('password');
      expect(filesServiceMock.getSignedUrlOrNull).not.toHaveBeenCalled();
    });

    it('findOne resolves avatarUrl when avatarFileId is set', async () => {
      filesServiceMock.getSignedUrlOrNull.mockResolvedValueOnce(
        'https://signed.example/avatar.png',
      );
      repository.findById.mockResolvedValueOnce({
        id: userId,
        email: 'with-avatar@example.com',
        tenantId,
        password: 'hashed-password',
        status: 'ACTIVE',
        avatarFileId: 'file-id',
        createdAt: new Date(),
      } as never);

      const result = await service.findOne(userId, tenantId);

      expect(filesServiceMock.getSignedUrlOrNull).toHaveBeenCalledWith(
        'file-id',
        tenantId,
      );
      expect(result).toMatchObject({
        avatarUrl: 'https://signed.example/avatar.png',
      });
    });

    it('search computes pendingInvite and strips password for every item', async () => {
      repository.search.mockResolvedValueOnce([
        {
          id: userId,
          email: 'accepted@example.com',
          tenantId,
          password: 'hashed-password',
          status: 'ACTIVE',
          createdAt: new Date(),
        },
      ] as never);
      repository.count.mockResolvedValueOnce(1);

      const result = await service.search({}, tenantId);

      expect(result.items).toEqual([
        expect.objectContaining({ pendingInvite: false }),
      ]);
      expect(result.items[0]).not.toHaveProperty('password');
    });
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
      expect(repository.anonymizeById).not.toHaveBeenCalled();
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
      expect(repository.anonymizeById).not.toHaveBeenCalled();
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
        where: { userId, revokedAt: null },
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
      repository.anonymizeById.mockResolvedValueOnce({
        ...ownUser,
        deletedAt: new Date(),
      } as never);

      await service.remove(userId, ownTenantId);

      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revokedAt: null },
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
