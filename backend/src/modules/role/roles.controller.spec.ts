import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

describe('RolesController', () => {
    let controller: RolesController;
    let service: jest.Mocked<RolesService>;

    const rolesServiceMock = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        attachUser: jest.fn(),
        detachUser: jest.fn(),
        attachPermission: jest.fn(),
        detachPermission: jest.fn(),
        search: jest.fn(),
        findPermissionsOfRole: jest.fn(),
        findUsersOfRole: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [RolesController],
            providers: [{ provide: RolesService, useValue: rolesServiceMock }],
        }).compile();

        controller = module.get<RolesController>(RolesController);
        service = module.get(RolesService);
    });

    it('should ignore tenantId from payload and use request tenant context when attaching a user', async () => {
        service.attachUser.mockResolvedValueOnce({ ok: true } as never);

        const dto = { tenantId: 'tenant-malicious', userId: 'user-1' };
        await controller.attachUser('role-1', dto, 'tenant-safe');

        expect(service.attachUser).toHaveBeenCalledWith('role-1', 'tenant-safe', 'user-1');
    });

    it('should use request tenant context when listing users of a role', async () => {
        service.findUsersOfRole.mockResolvedValueOnce([] as never);

        await controller.listUsers('role-1', 'tenant-safe');

        expect(service.findUsersOfRole).toHaveBeenCalledWith('role-1', 'tenant-safe');
    });
});
