import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { randomUUID } from 'crypto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const usersServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAllWithValidation: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getUserStats: jest.fn(),
    getAdultUserStats: jest.fn(),
    getActiveUsersCount: jest.fn(),
    getUsersByAgeRange: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /users', () => {
    it('should call create on service', async () => {
      const dto: CreateUserDto = {
        tenantId: randomUUID(),
        email: 'john@example.com',
        password: '123456',
      };
      const expected = { id: 'user-id', ...dto };
      service.create.mockResolvedValueOnce(expected as never);

      const result = await controller.create(dto);

      expect(result).toEqual(expected);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('GET /users', () => {
    it('should call findAllWithValidation on service', async () => {
      const expected = [
        { id: '1', email: 'john@example.com', name: 'John', isAdult: true },
        { id: '2', email: 'jane@example.com', name: 'Jane', isAdult: false },
      ];
      service.findAllWithValidation.mockResolvedValueOnce(expected as never);

      const result = await controller.findAll();

      expect(result).toEqual(expected);
      expect(service.findAllWithValidation).toHaveBeenCalledTimes(1);
    });
  });


  describe('GET /users/:id', () => {
    it('should call findOne on service with correct id', async () => {
      const id = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
      const expected = { id, email: 'john@example.com' };
      service.findOne.mockResolvedValueOnce(expected as never);

      const result = await controller.findOne(id);

      expect(result).toEqual(expected);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should call update on service with correct parameters', async () => {
      const id = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
      const dto: UpdateUserDto = { email: 'newjohn@example.com' };
      const expected = { id, email: 'john@example.com' };
      service.update.mockResolvedValueOnce(expected as never);

      const result = await controller.update(id, dto);

      expect(result).toEqual(expected);
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should call remove on service', async () => {
      const id = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
      const expected = { id, email: 'john@example.com' };
      service.remove.mockResolvedValueOnce(expected as never);

      const result = await controller.remove(id);

      expect(result).toEqual(expected);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
