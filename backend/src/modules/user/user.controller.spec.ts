import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { randomUUID } from 'crypto';
import { RolesService } from '../role/roles.service';
import { PermissionCacheService } from '@core/authorization/permission-cache.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const usersServiceMock = {
    invite: jest.fn(),
    resendInvite: jest.fn(),
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
        {
          provide: RolesService,
          useValue: {},
        },
        {
          provide: PermissionCacheService,
          useValue: { getFreshPermissions: jest.fn() },
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
    it('should call invite on service', async () => {
      const tenantId = randomUUID();
      const dto: CreateUserDto = {
        tenantId,
        email: 'john@example.com',
      };
      const expected = { id: 'user-id', ...dto, pendingInvite: true };
      service.invite.mockResolvedValueOnce(expected as never);

      const result = await controller.create(dto, tenantId);

      expect(result).toEqual(expected);
      expect(service.invite).toHaveBeenCalledWith(dto, tenantId);
    });
  });

  describe('POST /users/:id/invite/resend', () => {
    it('should call resendInvite on service', async () => {
      const id = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
      const tenantId = randomUUID();
      service.resendInvite.mockResolvedValueOnce(undefined);

      const result = await controller.resendInvite(id, tenantId);

      expect(result).toEqual({ message: 'Convite reenviado.' });
      expect(service.resendInvite).toHaveBeenCalledWith(id, tenantId);
    });
  });

  describe('GET /users', () => {
    it('should call findAllWithValidation on service scoped to the request tenant', async () => {
      const tenantId = randomUUID();
      const expected = [
        { id: '1', email: 'john@example.com', name: 'John', isAdult: true },
        { id: '2', email: 'jane@example.com', name: 'Jane', isAdult: false },
      ];
      service.findAllWithValidation.mockResolvedValueOnce(expected as never);

      const result = await controller.findAll(tenantId);

      expect(result).toEqual(expected);
      expect(service.findAllWithValidation).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('GET /users/:id', () => {
    it('should call findOne on service with the id and the request tenant', async () => {
      const id = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
      const tenantId = randomUUID();
      const expected = { id, email: 'john@example.com' };
      service.findOne.mockResolvedValueOnce(expected as never);

      const result = await controller.findOne(id, tenantId);

      expect(result).toEqual(expected);
      expect(service.findOne).toHaveBeenCalledWith(id, tenantId);
    });
  });

  describe('PATCH /users/:id', () => {
    it('should call update on service with the id, dto and the request tenant', async () => {
      const id = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
      const tenantId = randomUUID();
      const dto: UpdateUserDto = { email: 'newjohn@example.com' };
      const expected = { id, email: 'john@example.com' };
      service.update.mockResolvedValueOnce(expected as never);

      const result = await controller.update(id, dto, tenantId);

      expect(result).toEqual(expected);
      expect(service.update).toHaveBeenCalledWith(id, dto, tenantId);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should call remove on service with the id and the request tenant', async () => {
      const id = 'adf4f488-faa3-4fca-946e-522f7c2d4976';
      const tenantId = randomUUID();
      const expected = { id, email: 'john@example.com' };
      service.remove.mockResolvedValueOnce(expected as never);

      const result = await controller.remove(id, tenantId);

      expect(result).toEqual(expected);
      expect(service.remove).toHaveBeenCalledWith(id, tenantId);
    });
  });
});
