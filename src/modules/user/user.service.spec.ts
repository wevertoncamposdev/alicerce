import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/prisma/client';
import { UsersService } from './user.service';
import { UserMapper } from './mappers/user.mapper';
import { UserBusinessRules } from './domain/rules/user-business-rules';
import { UserErrorMapper } from './mappers/user-error.mapper';
import { UserRepository } from './persistence/repository/user.repository';

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

    beforeEach(async () => {
        jest.clearAllMocks();

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

        const result = await service.create({
            email: 'john@example.com',
            tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
            password: '123456',
        });

        expect(result).toEqual(mappedResult);
        expect(repository.create).toHaveBeenCalledWith({
            email: 'john@example.com',
            tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
            password: 'hashed-password',
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
            service.create({
                email: 'john@example.com',
                tenantId: 'adf4f488-faa3-4fca-946e-522f7c2d4976',
                password: '123456',
            }),
        ).rejects.toBeInstanceOf(ConflictException);
    });
});
