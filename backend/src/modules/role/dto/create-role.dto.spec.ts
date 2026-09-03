import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateRoleDto } from './create-role.dto';
import { CreatePermissionDto } from '@modules/permission/dto/create-permission.dto';

describe('create DTOs tenant enforcement', () => {
    it('rejects tenantId in role creation payloads so tenant comes only from @TenantId()', async () => {
        const pipe = new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        });

        await expect(
            pipe.transform(
                {
                    tenantId: '123e4567-e89b-12d3-a456-426614174000',
                    name: 'ADMIN',
                    type: 'ADMIN',
                },
                { type: 'body', metatype: CreateRoleDto },
            ),
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects tenantId in permission creation payloads so tenant comes only from @TenantId()', async () => {
        const pipe = new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        });

        await expect(
            pipe.transform(
                {
                    tenantId: '123e4567-e89b-12d3-a456-426614174000',
                    name: 'user.read',
                    type: 'READ',
                    resource: 'user',
                },
                { type: 'body', metatype: CreatePermissionDto },
            ),
        ).rejects.toThrow(BadRequestException);
    });
});
