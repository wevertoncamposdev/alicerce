import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

describe('PermissionsController', () => {
    let controller: PermissionsController;
    let service: jest.Mocked<PermissionsService>;

    const permissionsServiceMock = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        search: jest.fn(),
        findRolesOfPermission: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PermissionsController],
            providers: [{ provide: PermissionsService, useValue: permissionsServiceMock }],
        }).compile();

        controller = module.get<PermissionsController>(PermissionsController);
        service = module.get(PermissionsService);
    });

    it('should ignore tenantId from payload and use request tenant context when creating a permission', async () => {
        service.create.mockResolvedValueOnce({ id: 'perm-1' } as never);

        const dto = { tenantId: 'tenant-malicious', name: 'read:users', type: 'READ', resource: 'users', description: 'desc' };
        await controller.create(dto, 'tenant-safe');

        expect(service.create).toHaveBeenCalledWith(dto, 'tenant-safe');
    });

    it('should use request tenant context when listing roles', async () => {
        service.findRolesOfPermission.mockResolvedValueOnce([] as never);

        await controller.listRoles('perm-1', 'tenant-safe');

        expect(service.findRolesOfPermission).toHaveBeenCalledWith('perm-1', 'tenant-safe');
    });
});
