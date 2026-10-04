import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/client';
import { TenantService } from './tenant.service';
import { TenantBusinessRules } from './domain/rules/tenant-business-rules';
import { TenantErrorMapper } from './mappers/tenant-error.mapper';
import { TenantRepository } from './persistence/repository/tenant.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PrismaService } from '@core/prisma/prisma.service';

describe('TenantService', () => {
  let service: TenantService;
  let repository: jest.Mocked<TenantRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        TenantBusinessRules,
        TenantErrorMapper,
        {
          provide: TenantRepository,
          useValue: {
            create: jest.fn(),
            findMany: jest.fn(),
            findById: jest.fn(),
            updateById: jest.fn(),
            deleteById: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: { findMany: jest.fn() },
            role: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    repository = module.get(TenantRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should map prisma P2002 to conflict exception on create', async () => {
    const prismaError = Object.create(
      Prisma.PrismaClientKnownRequestError.prototype,
    ) as Prisma.PrismaClientKnownRequestError;

    Object.assign(prismaError, {
      code: 'P2002',
      meta: { target: ['registrationNumber'] },
    });

    repository.create.mockRejectedValueOnce(prismaError);

    const dto: CreateTenantDto = {
      legalName: 'Associacao Maravilhosa',
      registrationNumber: '12345678901234',
      slug: 'associacao-maravilhosa',
      category: 'ASSOCIATION',
      primaryServiceArea: 'OTHER',
    };

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  const ownTenantId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const otherTenantId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  it('findOne: should throw NotFoundException when requesting another tenant by id', async () => {
    await expect(
      service.findOne(otherTenantId, ownTenantId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('findOne: should return the tenant when requesting its own id', async () => {
    repository.findById.mockResolvedValueOnce({ id: ownTenantId } as never);

    const result = await service.findOne(ownTenantId, ownTenantId);

    expect(result).toEqual({ id: ownTenantId });
  });

  it('update: should throw NotFoundException when targeting another tenant by id', async () => {
    await expect(
      service.update(otherTenantId, {}, ownTenantId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('findUsersOfTenant: should throw NotFoundException when requesting another tenant', async () => {
    await expect(
      service.findUsersOfTenant(otherTenantId, ownTenantId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findRolesOfTenant: should throw NotFoundException when requesting another tenant', async () => {
    await expect(
      service.findRolesOfTenant(otherTenantId, ownTenantId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
