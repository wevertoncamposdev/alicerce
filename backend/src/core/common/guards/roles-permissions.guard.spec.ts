import { Reflector } from '@nestjs/core';
import { RolesPermissionsGuard } from './roles-permissions.guard';

class TestController { }

describe('RolesPermissionsGuard', () => {
    it('accepts nested role and permission objects emitted by the auth payload', () => {
        const guard = new RolesPermissionsGuard(new Reflector());
        const handler = () => undefined;

        Reflect.defineMetadata('roles', ['ADMIN'], handler);
        Reflect.defineMetadata('roles', ['ADMIN'], TestController);
        Reflect.defineMetadata('permissions', ['user.read'], handler);
        Reflect.defineMetadata('permissions', ['user.read'], TestController);

        const context = {
            getHandler: () => handler,
            getClass: () => TestController,
            switchToHttp: () => ({
                getRequest: () => ({
                    user: {
                        roles: [
                            { role: { type: 'Admin' } },
                            'USER',
                        ],
                        permissions: [
                            { permission: { name: 'user.read' } },
                        ],
                    },
                }),
            }),
        } as any;

        expect(() => guard.canActivate(context)).not.toThrow();
        expect(guard.canActivate(context)).toBe(true);
    });
});
