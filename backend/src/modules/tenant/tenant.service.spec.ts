import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/client';
import { TenantService } from './tenant.service';
import { TenantBusinessRules } from './domain/rules/tenant-business-rules';
import { TenantErrorMapper } from './mappers/tenant-error.mapper';
import { TenantRepository } from './persistence/repository/tenant.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';

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
    } as CreateTenantDto;

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });
});
